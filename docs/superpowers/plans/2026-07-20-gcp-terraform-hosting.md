# GCP Terraform Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host the Everware FastAPI site on Cloud Run (staging + prod), provisioned with Terraform, deployed from GitHub Actions by branch.

**Architecture:** A container image (built from the existing FastAPI app) runs on two Cloud Run v2 services — `everware-staging` and `everware-prod` — in `europe-west4`. Terraform declares all infra: a shared layer (enabled APIs, one Artifact Registry repo, Workload Identity Federation, a deploy service account) and a reusable `app` module instantiated once per environment (Cloud Run service, runtime SA, Secret Manager container, public invoker IAM, custom-domain mapping). GitHub Actions builds+pushes an image on push and deploys it: `staging` branch → staging service, `main` → prod service. Custom-domain TLS via Cloud Run domain mapping.

**Tech Stack:** Python 3.12 / FastAPI / uv, Docker, Terraform (hashicorp/google `~> 6.0`), Google Cloud Run v2, Artifact Registry, Secret Manager, Workload Identity Federation, GitHub Actions.

## Global Constraints

- **Region:** `europe-west4` (all regional resources).
- **Terraform:** `>= 1.5`; provider `hashicorp/google ~> 6.0`.
- **Python:** `>= 3.12` (matches `pyproject.toml`).
- **Single project** — no org landing zone, no VPC, no database.
- **Image tag:** every build tags by git SHA: `europe-west4-docker.pkg.dev/<PROJECT_ID>/everware/everware:<SHA>`.
- **Secrets:** `RESEND_API_KEY` only ever via Secret Manager (never in Terraform state, tfvars, or the image). Secret *values* are added out-of-band with `gcloud`.
- **Container port:** app listens on `$PORT` (Cloud Run injects `8080`).
- **Repo (for WIF):** `Ken-vdE/Everware`.
- **Environments:** staging = `ENVIRONMENT=staging` (noindex), prod = `ENVIRONMENT=production` (indexed).
- **Service naming:** `everware-staging`, `everware-prod`.
- **Secret naming:** `resend-api-key-staging`, `resend-api-key-prod`.
- **Domains:** staging → `staging.everware.nl`; prod → `everware.nl`, `www.everware.nl`.
- **Terraform state:** GCS backend, one versioned bucket, prefixes `shared` / `staging` / `prod`. Bucket created by `bootstrap.sh` before any `apply`.
- **Commits:** frequent, one per task minimum. Do NOT push without the user's OK.

---

### Task 1: Staging noindex middleware (app code)

The only product-code change. When `ENVIRONMENT=staging`, every response gets `X-Robots-Tag: noindex, nofollow`. Read at request time so it is testable and env-driven.

**Files:**
- Modify: `server/main.py` (add middleware after `app = FastAPI(...)` on line 33)
- Test: `tests/test_server.py` (append two tests)

**Interfaces:**
- Consumes: existing `app` (FastAPI) and module-level `client = TestClient(app)` in the test file.
- Produces: nothing other tasks import. Behavior: response header `X-Robots-Tag` present iff `os.getenv("ENVIRONMENT") == "staging"`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_server.py`:

```python
# ---- staging noindex ----

def test_staging_adds_noindex_header(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "staging")
    r = client.get("/")
    assert r.headers.get("x-robots-tag") == "noindex, nofollow"


def test_production_has_no_noindex_header(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    r = client.get("/")
    assert "x-robots-tag" not in r.headers


def test_unset_environment_has_no_noindex_header(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    r = client.get("/")
    assert "x-robots-tag" not in r.headers
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_server.py -k noindex -v`
Expected: FAIL — `test_staging_adds_noindex_header` asserts a header that does not exist yet (`None != "noindex, nofollow"`).

- [ ] **Step 3: Add the middleware**

In `server/main.py`, immediately after line 33 (`app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)`), insert:

```python


@app.middleware("http")
async def noindex_when_staging(request: Request, call_next):
    """Keep the staging environment out of search indexes."""
    response = await call_next(request)
    if os.getenv("ENVIRONMENT") == "staging":
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response
```

(`os`, `Request`, and `app` are already imported/defined above — no new imports.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_server.py -k noindex -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `uv run pytest -q`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/main.py tests/test_server.py
git commit -m "feat: add staging noindex response header"
```

---

### Task 2: Containerize the app (Dockerfile + .dockerignore)

Produce a runnable image that serves the site and binds `$PORT`.

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: `pyproject.toml`, `uv.lock`, and the app source (`server/`, `templates/`, `content/`, `public/`).
- Produces: an image whose entrypoint runs `uvicorn server.main:app` on `$PORT` (default 8080). Later tasks (compose, CI) build this image.

- [ ] **Step 1: Write `.dockerignore`**

```
.git
.venv
.idea
.pytest_cache
__pycache__
*.pyc
logs
tests
docs
scripts
.env
.env.example
public/index.html
public/en/index.html
```

(`public/index.html` and `public/en/index.html` are generated at startup by `render.py`; exclude the untracked copies so the image regenerates them fresh.)

- [ ] **Step 2: Write the `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim

# uv for fast, reproducible installs (pinned by uv.lock)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Install dependencies first (better layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App source
COPY . .
RUN uv sync --frozen --no-dev

# Run as non-root; /app must be writable (render.py writes generated pages)
RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uv run --no-dev uvicorn server.main:app --host 0.0.0.0 --port ${PORT}"]
```

- [ ] **Step 3: Build the image**

Run: `docker build -t everware:local .`
Expected: build completes, final image tagged `everware:local`.

- [ ] **Step 4: Run it and verify the site serves**

Run:
```bash
docker run --rm -d -p 8080:8080 -e ENVIRONMENT=production --name everware-test everware:local
sleep 3
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/
docker rm -f everware-test
```
Expected: prints `200`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: containerize the FastAPI site"
```

---

### Task 3: Local dev via Docker Compose

**Files:**
- Create: `compose.yaml`

**Interfaces:**
- Consumes: the `Dockerfile` from Task 2 and `.env` (local, gitignored).
- Produces: `docker compose up` serving the site with live-reload on `public/`, `content/`, `templates/`.

- [ ] **Step 1: Write `compose.yaml`**

```yaml
# Local development only. Production deploys the built image to Cloud Run.
services:
  web:
    build: .
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      ENVIRONMENT: staging   # local mirrors staging (noindex)
    volumes:
      - ./public:/app/public
      - ./content:/app/content
      - ./templates:/app/templates
      - ./server:/app/server
    command: >
      uv run --no-dev uvicorn server.main:app
      --host 0.0.0.0 --port 8080 --reload
```

- [ ] **Step 2: Verify it comes up**

Run:
```bash
docker compose up -d --build
sleep 4
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/
curl -sS -D - -o /dev/null http://localhost:8080/ | grep -i x-robots-tag
docker compose down
```
Expected: `200`, and an `X-Robots-Tag: noindex, nofollow` header (because `ENVIRONMENT=staging`).

- [ ] **Step 3: Commit**

```bash
git add compose.yaml
git commit -m "feat: docker compose for local dev"
```

---

### Task 4: Terraform shared layer — APIs, Artifact Registry, backend, bootstrap

Create the shared foundation and the state-bucket bootstrap script.

**Files:**
- Create: `infra/shared/versions.tf`
- Create: `infra/shared/backend.tf`
- Create: `infra/shared/variables.tf`
- Create: `infra/shared/apis.tf`
- Create: `infra/shared/artifact_registry.tf`
- Create: `infra/shared/outputs.tf`
- Create: `infra/bootstrap.sh`
- Create/Modify: `.gitignore` (append Terraform ignores)

**Interfaces:**
- Consumes: a GCP project id + the state bucket name (via `-backend-config`).
- Produces: enabled APIs; an Artifact Registry Docker repo named `everware` in `europe-west4`. Output `artifact_registry_repo` = repo id. Later tasks (5, CI) build on this.

- [ ] **Step 1: Append Terraform ignores to `.gitignore`**

Append:
```
# Terraform
**/.terraform/*
*.tfstate
*.tfstate.*
crash.log
*.tfplan
```

- [ ] **Step 2: `infra/shared/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

- [ ] **Step 3: `infra/shared/backend.tf`**

```hcl
terraform {
  backend "gcs" {
    prefix = "shared"
    # bucket supplied at init: terraform init -backend-config="bucket=<NAME>"
  }
}
```

- [ ] **Step 4: `infra/shared/variables.tf`**

```hcl
variable "project_id" {
  type        = string
  description = "GCP project ID hosting the Everware site."
}

variable "region" {
  type        = string
  default     = "europe-west4"
}

variable "github_repository" {
  type        = string
  default     = "Ken-vdE/Everware"
  description = "owner/name of the GitHub repo allowed to deploy."
}
```

- [ ] **Step 5: `infra/shared/apis.tf`**

```hcl
locals {
  services = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.services)
  service            = each.value
  disable_on_destroy = false
}
```

- [ ] **Step 6: `infra/shared/artifact_registry.tf`**

```hcl
resource "google_artifact_registry_repository" "everware" {
  location      = var.region
  repository_id = "everware"
  format        = "DOCKER"
  description   = "Everware site container images."
  depends_on    = [google_project_service.enabled]
}
```

- [ ] **Step 7: `infra/shared/outputs.tf`**

```hcl
output "artifact_registry_repo" {
  value = google_artifact_registry_repository.everware.repository_id
}

output "region" {
  value = var.region
}
```

- [ ] **Step 8: `infra/bootstrap.sh`**

```bash
#!/usr/bin/env bash
# One-time: create the versioned GCS bucket that holds Terraform state.
# Usage: ./infra/bootstrap.sh <PROJECT_ID> [BUCKET_NAME]
set -euo pipefail

PROJECT_ID="${1:?usage: bootstrap.sh <PROJECT_ID> [BUCKET_NAME]}"
BUCKET="${2:-${PROJECT_ID}-tfstate}"
REGION="europe-west4"

gcloud config set project "$PROJECT_ID"
gcloud storage buckets create "gs://${BUCKET}" \
  --location="$REGION" \
  --uniform-bucket-level-access
gcloud storage buckets update "gs://${BUCKET}" --versioning

echo
echo "State bucket ready: gs://${BUCKET}"
echo "Init each config with: terraform init -backend-config=\"bucket=${BUCKET}\""
```

Then: `chmod +x infra/bootstrap.sh`

- [ ] **Step 9: Validate (formatting + syntax, no cloud calls)**

Run: `cd infra/shared && terraform fmt && terraform init -backend=false && terraform validate`
Expected: `Success! The configuration is valid.`
(`-backend=false` skips remote state so validation needs no bucket/credentials.)

- [ ] **Step 10: Commit**

```bash
git add infra/shared/*.tf infra/bootstrap.sh .gitignore
git commit -m "feat: terraform shared layer (apis, artifact registry, backend)"
```

---

### Task 5: Terraform shared layer — Workload Identity Federation + deploy SA

Keyless GitHub Actions auth: a WIF pool/provider trusting `Ken-vdE/Everware`, and a deploy service account it may impersonate.

**Files:**
- Create: `infra/shared/wif.tf`
- Create: `infra/shared/deploy_sa.tf`
- Modify: `infra/shared/outputs.tf`

**Interfaces:**
- Consumes: `var.project_id`, `var.github_repository`, `google_project_service.enabled`.
- Produces outputs consumed by the GitHub Actions workflow (Task 9), set as repo Actions Variables:
  - `wif_provider` — full provider resource name (`projects/…/locations/global/workloadIdentityPools/github-pool/providers/github-provider`)
  - `deploy_service_account` — deployer SA email

- [ ] **Step 1: `infra/shared/deploy_sa.tf`**

```hcl
resource "google_service_account" "deployer" {
  account_id   = "gh-deployer"
  display_name = "GitHub Actions deployer"
  depends_on   = [google_project_service.enabled]
}

# Roles the CI pipeline needs: deploy revisions, push images, act as runtime SAs.
resource "google_project_iam_member" "deployer_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}
```

- [ ] **Step 2: `infra/shared/wif.tf`**

```hcl
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.enabled]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Restrict federation to this repository only.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow any workflow in the repo to impersonate the deployer SA.
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}
```

- [ ] **Step 3: Append to `infra/shared/outputs.tf`**

```hcl
output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "deploy_service_account" {
  value = google_service_account.deployer.email
}
```

- [ ] **Step 4: Validate**

Run: `cd infra/shared && terraform fmt && terraform validate`
Expected: `Success! The configuration is valid.`

- [ ] **Step 5: Commit**

```bash
git add infra/shared/wif.tf infra/shared/deploy_sa.tf infra/shared/outputs.tf
git commit -m "feat: terraform WIF + deploy service account"
```

---

### Task 6: Terraform `app` module (reusable per-environment stack)

One module producing: a Cloud Run v2 service, its runtime SA, a Secret Manager container + accessor binding, public invoker IAM, and domain mapping(s). The service's `image` is managed by CI after creation, so Terraform ignores image drift and boots from a placeholder.

**Files:**
- Create: `infra/modules/app/variables.tf`
- Create: `infra/modules/app/main.tf`
- Create: `infra/modules/app/secret.tf`
- Create: `infra/modules/app/iam.tf`
- Create: `infra/modules/app/domain.tf`
- Create: `infra/modules/app/outputs.tf`

**Interfaces:**
- Consumes (module inputs): `project_id`, `region`, `service_name`, `environment`, `site_url`, `contact_to`, `contact_from`, `secret_id`, `domains` (list(string)), `min_instances` (number), `max_instances` (number), `image` (string, optional).
- Produces (module outputs): `service_uri` (string), `service_name` (string), `runtime_service_account` (email string). Consumed by env root configs (Tasks 7–8) and their outputs.

- [ ] **Step 1: `infra/modules/app/variables.tf`**

```hcl
variable "project_id" { type = string }
variable "region" { type = string }
variable "service_name" { type = string }
variable "environment" { type = string }        # "staging" | "production"
variable "site_url" { type = string }
variable "contact_to" { type = string }
variable "contact_from" { type = string }
variable "secret_id" { type = string }           # Secret Manager secret id
variable "domains" { type = list(string) }
variable "min_instances" { type = number }
variable "max_instances" { type = number }

variable "image" {
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
  description = "Initial image; CI replaces it on deploy (drift ignored)."
}
```

- [ ] **Step 2: `infra/modules/app/secret.tf`**

```hcl
# Container only — the value is added out-of-band with:
#   gcloud secrets versions add <secret_id> --data-file=-
resource "google_secret_manager_secret" "resend" {
  secret_id = var.secret_id
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "runtime_access" {
  secret_id = google_secret_manager_secret.resend.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}
```

- [ ] **Step 3: `infra/modules/app/main.tf`**

```hcl
resource "google_service_account" "runtime" {
  account_id   = "${var.service_name}-run"
  display_name = "${var.service_name} runtime"
}

resource "google_cloud_run_v2_service" "app" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "SITE_URL"
        value = var.site_url
      }
      env {
        name  = "CONTACT_TO"
        value = var.contact_to
      }
      env {
        name  = "CONTACT_FROM"
        value = var.contact_from
      }
      env {
        name = "RESEND_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.resend.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  # CI manages the deployed image; don't revert it on the next terraform apply.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_secret_manager_secret_iam_member.runtime_access]
}
```

- [ ] **Step 4: `infra/modules/app/iam.tf`**

```hcl
# Public marketing site — anyone may invoke.
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

- [ ] **Step 5: `infra/modules/app/domain.tf`**

```hcl
# Cloud Run domain mapping (v1 resource). DNS records + domain verification
# are a manual one-time step (see the plan's bootstrap notes).
resource "google_cloud_run_domain_mapping" "map" {
  for_each = toset(var.domains)
  location = var.region
  name     = each.value

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.app.name
  }
}
```

- [ ] **Step 6: `infra/modules/app/outputs.tf`**

```hcl
output "service_uri" {
  value = google_cloud_run_v2_service.app.uri
}

output "service_name" {
  value = google_cloud_run_v2_service.app.name
}

output "runtime_service_account" {
  value = google_service_account.runtime.email
}
```

- [ ] **Step 7: Format check**

Run: `cd infra && terraform fmt -recursive`
Expected: lists any reformatted module files (or no output). The module is validated when instantiated in Task 7.

- [ ] **Step 8: Commit**

```bash
git add infra/modules/app/*.tf
git commit -m "feat: terraform app module (cloud run, secret, iam, domain)"
```

---

### Task 7: Terraform staging environment

Instantiate the `app` module for staging with its own state.

**Files:**
- Create: `infra/environments/staging/versions.tf`
- Create: `infra/environments/staging/backend.tf`
- Create: `infra/environments/staging/main.tf`
- Create: `infra/environments/staging/terraform.tfvars`

**Interfaces:**
- Consumes: `infra/modules/app` (all inputs from Task 6), `var.project_id`.
- Produces output `service_uri` for the staging service.

- [ ] **Step 1: `infra/environments/staging/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" { type = string }
variable "region" {
  type    = string
  default = "europe-west4"
}
```

- [ ] **Step 2: `infra/environments/staging/backend.tf`**

```hcl
terraform {
  backend "gcs" {
    prefix = "staging"
    # bucket supplied at init: -backend-config="bucket=<NAME>"
  }
}
```

- [ ] **Step 3: `infra/environments/staging/main.tf`**

```hcl
module "app" {
  source = "../../modules/app"

  project_id    = var.project_id
  region        = var.region
  service_name  = "everware-staging"
  environment   = "staging"
  site_url      = "https://staging.everware.nl"
  contact_to    = "hallo@everware.nl"
  contact_from  = "onboarding@resend.dev"
  secret_id     = "resend-api-key-staging"
  domains       = ["staging.everware.nl"]
  min_instances = 0
  max_instances = 2
}

output "service_uri" {
  value = module.app.service_uri
}
```

- [ ] **Step 4: `infra/environments/staging/terraform.tfvars`**

```hcl
project_id = "REPLACE_WITH_PROJECT_ID"
```

- [ ] **Step 5: Validate (no backend, no cloud calls)**

Run: `cd infra/environments/staging && terraform fmt && terraform init -backend=false && terraform validate`
Expected: `Success! The configuration is valid.` This also validates the Task 6 module.

- [ ] **Step 6: Commit**

```bash
git add infra/environments/staging/*.tf infra/environments/staging/terraform.tfvars
git commit -m "feat: terraform staging environment"
```

---

### Task 8: Terraform prod environment

Same shape as staging, prod values, own state.

**Files:**
- Create: `infra/environments/prod/versions.tf`
- Create: `infra/environments/prod/backend.tf`
- Create: `infra/environments/prod/main.tf`
- Create: `infra/environments/prod/terraform.tfvars`

**Interfaces:**
- Consumes: `infra/modules/app`, `var.project_id`.
- Produces output `service_uri` for the prod service.

- [ ] **Step 1: `infra/environments/prod/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" { type = string }
variable "region" {
  type    = string
  default = "europe-west4"
}
```

- [ ] **Step 2: `infra/environments/prod/backend.tf`**

```hcl
terraform {
  backend "gcs" {
    prefix = "prod"
    # bucket supplied at init: -backend-config="bucket=<NAME>"
  }
}
```

- [ ] **Step 3: `infra/environments/prod/main.tf`**

```hcl
module "app" {
  source = "../../modules/app"

  project_id    = var.project_id
  region        = var.region
  service_name  = "everware-prod"
  environment   = "production"
  site_url      = "https://everware.nl"
  contact_to    = "hallo@everware.nl"
  contact_from  = "onboarding@resend.dev"
  secret_id     = "resend-api-key-prod"
  domains       = ["everware.nl", "www.everware.nl"]
  min_instances = 0
  max_instances = 4
}

output "service_uri" {
  value = module.app.service_uri
}
```

- [ ] **Step 4: `infra/environments/prod/terraform.tfvars`**

```hcl
project_id = "REPLACE_WITH_PROJECT_ID"
```

- [ ] **Step 5: Validate**

Run: `cd infra/environments/prod && terraform fmt && terraform init -backend=false && terraform validate`
Expected: `Success! The configuration is valid.`

- [ ] **Step 6: Commit**

```bash
git add infra/environments/prod/*.tf infra/environments/prod/terraform.tfvars
git commit -m "feat: terraform prod environment"
```

---

### Task 9: GitHub Actions deploy workflow

Build+push on push, deploy by branch. Keyless via WIF. Requires three repo Actions **Variables** (not secrets — all non-sensitive): `GCP_PROJECT_ID`, `WIF_PROVIDER`, `DEPLOY_SA`.

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: repo Actions Variables `GCP_PROJECT_ID`, `WIF_PROVIDER` (= shared output `wif_provider`), `DEPLOY_SA` (= shared output `deploy_service_account`); the `Dockerfile` (Task 2); the Artifact Registry repo `everware` (Task 4); services `everware-staging` / `everware-prod` (Tasks 7–8).
- Produces: a new Cloud Run revision per push.

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: deploy

on:
  push:
    branches: [staging, main]

permissions:
  contents: read
  id-token: write   # required for Workload Identity Federation

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Select environment
        id: env
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "service=everware-prod" >> "$GITHUB_OUTPUT"
          else
            echo "service=everware-staging" >> "$GITHUB_OUTPUT"
          fi

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          project_id: ${{ vars.GCP_PROJECT_ID }}
          workload_identity_provider: ${{ vars.WIF_PROVIDER }}
          service_account: ${{ vars.DEPLOY_SA }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Build and push image
        run: |
          gcloud auth configure-docker europe-west4-docker.pkg.dev --quiet
          IMAGE="europe-west4-docker.pkg.dev/${{ vars.GCP_PROJECT_ID }}/everware/everware:${{ github.sha }}"
          docker build -t "$IMAGE" .
          docker push "$IMAGE"
          echo "IMAGE=$IMAGE" >> "$GITHUB_ENV"

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ steps.env.outputs.service }}
          region: europe-west4
          image: ${{ env.IMAGE }}
```

- [ ] **Step 2: Lint the YAML**

Run: `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy to Cloud Run by branch (staging/main)"
```

---

### Task 10: Deployment docs + operator runbook

Document the one-time bootstrap and the ongoing deploy flow so the infra is reproducible.

**Files:**
- Modify: `README.md` (add a "Deployment (GCP)" section)

**Interfaces:**
- Consumes: everything above. No code depends on this task.

- [ ] **Step 1: Append a "Deployment (GCP)" section to `README.md`**

````markdown
## Deployment (GCP)

Hosted on Cloud Run (`europe-west4`), two environments, provisioned with Terraform
(`infra/`) and deployed by GitHub Actions:

- push to `staging` → deploys `everware-staging` (https://staging.everware.nl)
- push to `main` → deploys `everware-prod` (https://everware.nl)

### One-time bootstrap

```bash
# 1. Create the project and link billing (console or gcloud), then:
gcloud auth application-default login

# 2. Create the Terraform state bucket
./infra/bootstrap.sh <PROJECT_ID>          # bucket: <PROJECT_ID>-tfstate

# 3. Apply shared infra (APIs, Artifact Registry, WIF, deploy SA)
cd infra/shared
terraform init -backend-config="bucket=<PROJECT_ID>-tfstate"
terraform apply -var="project_id=<PROJECT_ID>"

# 4. Note the outputs — set them as GitHub repo Actions *Variables*:
#    GCP_PROJECT_ID = <PROJECT_ID>
#    WIF_PROVIDER   = $(terraform output -raw wif_provider)
#    DEPLOY_SA      = $(terraform output -raw deploy_service_account)

# 5. Apply each environment (set project_id in its terraform.tfvars first)
cd ../environments/staging
terraform init -backend-config="bucket=<PROJECT_ID>-tfstate"
terraform apply
cd ../prod
terraform init -backend-config="bucket=<PROJECT_ID>-tfstate"
terraform apply

# 6. Add the Resend API key to each environment's secret
printf '%s' "<RESEND_KEY>" | gcloud secrets versions add resend-api-key-staging --data-file=-
printf '%s' "<RESEND_KEY>" | gcloud secrets versions add resend-api-key-prod --data-file=-

# 7. Verify domains + set DNS
#    Cloud Run prints the required DNS records for each mapped domain:
gcloud beta run domain-mappings describe --domain=staging.everware.nl --region=europe-west4
#    Add those records at the registrar for staging.everware.nl, everware.nl, www.everware.nl.
#    Verify domain ownership in Google Search Console if prompted.
```

### Deploy

```bash
git push origin staging   # → staging
# promote by merging staging → main:
git push origin main       # → prod
```

Images are tagged by commit SHA in Artifact Registry. Terraform ignores the running
image, so `terraform apply` never reverts a CI deploy.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: GCP deployment runbook"
```

---

## Post-implementation (manual, requires GCP account — not part of task commits)

These need a real GCP project, billing, and DNS access; run them once after the code lands:

1. `./infra/bootstrap.sh <PROJECT_ID>`
2. `terraform apply` in `shared/`, then `environments/staging/`, then `environments/prod/`.
3. Set the three GitHub Actions Variables from the shared outputs.
4. Add the Resend secret value to each env.
5. Verify domains + set DNS records.
6. Push `staging`, confirm the staging URL serves and returns `X-Robots-Tag: noindex`; merge to `main`, confirm prod serves without it.

## Notes / Risks

- **Domain mapping is preview** (works in `europe-west4`, minor added latency). Acceptable for a marketing site; revisit a global load balancer only if latency or CDN/Cloud Armor becomes a requirement.
- **First deploy before the secret exists** will make the Cloud Run revision fail to start (the secret env ref resolves at deploy). Add the secret value (bootstrap step 6) before or immediately after the first `terraform apply`; the service becomes healthy once a secret version exists.
- **Branch divergence**: staging and prod build independent images. Promote by merging `staging` → `main`, not by pushing unrelated commits to `main`.
- **State bucket** is created outside Terraform by `bootstrap.sh` (it cannot live in the state it stores).
