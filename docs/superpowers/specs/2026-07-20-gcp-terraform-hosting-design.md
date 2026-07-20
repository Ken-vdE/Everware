# GCP Hosting via Terraform — Design

**Date:** 2026-07-20
**Status:** Approved (pending spec review)
**Topic:** Host the Everware FastAPI site on Google Cloud Run, provisioned with Terraform, across `staging` and `prod` environments, deployed from GitHub Actions.

## Summary

The Everware site is a small, stateless FastAPI app: it serves a static site from
`public/` and exposes one endpoint (`POST /api/contact`) that forwards submissions
via the Resend API. No database, no persistent state.

This design hosts it on **Cloud Run** (serverless, scale-to-zero), with all
infrastructure declared in **Terraform** and deployments driven by **GitHub Actions**.
There are two environments — **staging** and **prod** — selected by git branch.

Region: **`europe-west4`** (Netherlands), closest to the Dutch audience and
`everware.nl`.

## Goals

- One-command-ish, reproducible infrastructure defined as code (Terraform).
- Two isolated environments (staging, prod) with separate Terraform state.
- Push-to-deploy: `staging` branch → staging, `main` branch → prod.
- Keyless CI auth (Workload Identity Federation — no long-lived JSON keys).
- Managed TLS on custom domains; scale-to-zero to keep idle cost near zero.
- Staging is publicly reachable for review but never indexed by search engines.

## Non-Goals (explicitly out of scope)

- **Database / VPC** — the app is stateless today. A DB (Cloud SQL) is a separate
  future spec that would add VPC networking and migrations.
- **Same-digest promotion** — we use branch-based builds (each branch builds its own
  image), not digest promotion from staging to prod.
- **Additional environments** beyond staging and prod.
- **Multi-region / global load balancing.**
- **Org landing zone / Cloud Foundation Blueprint** — GCP's Cloud Setup wizard
  output (folders, shared VPC, multi-team projects, org policies, SCC, Google
  Groups) is enterprise-scale and out of scope. This app lives in a single plain
  project. Adopt a foundation only if Everware later hosts many apps/teams.

## Architecture

### Runtime — Cloud Run v2

Each environment runs its own Cloud Run service:

| Property | staging | prod |
|---|---|---|
| Service name | `everware-staging` | `everware-prod` |
| Custom domain | `staging.everware.nl` | `everware.nl` + `www.everware.nl` |
| Secret container | `resend-api-key-staging` | `resend-api-key-prod` |
| Public (`allUsers` invoker) | yes | yes |
| Search-indexed | **no** (`X-Robots-Tag: noindex`) | yes |
| `min_instances` / `max_instances` | 0 / 2 | 0 / 4 |
| CPU / memory | 1 vCPU / 512Mi | 1 vCPU / 512Mi |
| Container concurrency | 80 | 80 |

Common runtime details:

- The container binds `$PORT` (Cloud Run injects `8080`).
- `server/render.py` renders both language pages at startup — unchanged, works on boot.
- A dedicated **runtime service account** per env, least-privilege: only
  `roles/secretmanager.secretAccessor` on its own secret.
- Environment variables on the service:
  - Plain (from tfvars): `CONTACT_TO`, `CONTACT_FROM`, `SITE_URL`, `ENVIRONMENT`.
  - Secret (Secret Manager ref, `latest`): `RESEND_API_KEY`.

### Secrets

Terraform creates the **secret container** only. The secret **value** is added
out-of-band (`gcloud secrets versions add …`) so the Resend key never lands in
Terraform state. The service references version `latest`.

### Container image

- `Dockerfile`: `python:3.12-slim`, dependencies installed with `uv`, runs as a
  non-root user, launches `uvicorn server.main:app --host 0.0.0.0 --port $PORT`.
- `.dockerignore` excludes `.venv/`, `.git/`, caches, logs, tests.
- Images are pushed to a single shared **Artifact Registry** Docker repo and tagged
  by git SHA.

### Logging

Container stderr is captured automatically by **Cloud Logging**. The app's rotating
`logs/everware.log` still writes inside the container but is ephemeral and harmless;
stderr is the source of truth. No logging code change required.

## Terraform Structure

Separate state per environment (strong isolation — a staging apply can never touch
prod). Three states, all in one versioned GCS bucket under different prefixes.

```
infra/
  shared/                      # global resources, own state
    apis.tf                    # enable required GCP APIs (once)
    artifact_registry.tf       # ONE docker repo, shared by both envs
    wif.tf                     # Workload Identity Federation pool + provider
    deploy_sa.tf               # deploy service account + project-level IAM
    versions.tf
    backend.tf                 # GCS backend, prefix = shared
    variables.tf
    outputs.tf
  modules/
    app/                       # reusable per-env application stack
      main.tf                  # Cloud Run service + runtime SA
      secret.tf                # Secret Manager container + IAM
      domain.tf                # Cloud Run domain mapping(s)
      iam.tf                   # allUsers invoker
      variables.tf
      outputs.tf
  environments/
    staging/
      main.tf                  # module "app" with staging inputs
      backend.tf               # GCS backend, prefix = staging
      terraform.tfvars         # SITE_URL=staging.everware.nl, ENVIRONMENT=staging
      versions.tf
    prod/
      main.tf                  # module "app" with prod inputs
      backend.tf               # GCS backend, prefix = prod
      terraform.tfvars         # SITE_URL=everware.nl, ENVIRONMENT=production
      versions.tf
  terraform.tfvars.example
```

### Shared (global) resources

- **API enablement**: `run`, `artifactregistry`, `secretmanager`, `iam`,
  `cloudresourcemanager` (and any transitively required).
- **Artifact Registry**: one Docker repo in `europe-west4`, used by both envs.
- **Workload Identity Federation**: a pool + a GitHub OIDC provider, constrained by
  an attribute condition to the `Ken-vdE/Everware` repository.
- **Deploy service account**: impersonated by GitHub Actions via WIF. Project-level
  roles: `roles/run.admin`, `roles/artifactregistry.writer`,
  `roles/iam.serviceAccountUser`. Used by both branch workflows.

### Module inputs (per env)

`service_name`, `region`, `image`, `domains` (list), `site_url`, `environment`,
`contact_to`, `contact_from`, `secret_id`, `min_instances`, `max_instances`,
`project_id`.

## CI/CD — GitHub Actions

One workflow, `.github/workflows/deploy.yml`, mapping branch → environment:

- Push to **`staging`** → build `…/everware:${GITHUB_SHA}` → push → deploy the
  **staging** Cloud Run service.
- Push to **`main`** → build `…/everware:${GITHUB_SHA}` → push → deploy the **prod**
  Cloud Run service.

Steps:

1. `google-github-actions/auth` with Workload Identity Federation (keyless).
2. Build with buildx, push to Artifact Registry.
3. `google-github-actions/deploy-cloudrun` targeting the branch's service with the
   freshly pushed image.

Promotion model: to ship to prod, merge `staging` → `main`. Each branch builds its
own image; there is no cross-env digest promotion (see Non-Goals).

## Application Change — staging noindex

The only product-code change. Add a small middleware in `server/main.py`: when the
`ENVIRONMENT` env var equals `staging`, attach `X-Robots-Tag: noindex, nofollow` to
every response. Prod (`ENVIRONMENT=production`) is unaffected. This keeps
`staging.everware.nl` out of search indexes without a separate robots file.

Approx. 5 lines + reading one env var. Covered by a test asserting the header is
present in staging mode and absent otherwise.

## Local Development

`compose.yaml` (app only) builds the same `Dockerfile` and runs uvicorn with
`--reload`, mounting `public/`, `content/`, and `templates/` for live edits. Local
behavior mirrors prod container shape. `.env` supplies config locally.

## One-Time Bootstrap Sequence

1. Create a GCP project and link billing.
2. `gcloud auth application-default login`.
3. `./bootstrap.sh` — creates the versioned GCS state bucket.
4. `terraform apply` in `infra/shared/`, then `infra/environments/staging/`, then
   `infra/environments/prod/`.
5. Add secret values per env: `gcloud secrets versions add resend-api-key-staging …`
   and `… resend-api-key-prod …`.
6. Verify domains and set DNS records for `staging.everware.nl`, `everware.nl`, and
   `www.everware.nl` (GCP cannot automate DNS at the registrar).
7. Push the `staging` branch → staging deploys. Merge to `main` → prod deploys.

## Testing

- **App**: existing pytest suite continues to pass. Add a test for the staging
  noindex middleware (header present when `ENVIRONMENT=staging`, absent otherwise).
- **Container**: `docker build` succeeds; `docker compose up` serves the site locally
  and the contact endpoint responds.
- **Terraform**: `terraform validate` and `terraform plan` succeed for `shared`,
  `staging`, and `prod`.
- **End-to-end**: after bootstrap, staging URL serves the site and returns the
  noindex header; prod URL serves without it.

## Risks / Notes

- **DNS + domain verification** is manual and must be done once per domain before the
  managed TLS cert provisions (can take time to propagate).
- **State bucket is a bootstrap dependency** — it cannot live in the same state it
  stores, hence `bootstrap.sh` creates it outside Terraform.
- **Branch-based builds** mean staging and prod images can diverge if branches
  diverge; discipline is to promote by merging `staging` → `main`.
- **Secret values are manual** — first deploy will fail to send email until the
  secret version is added; the app degrades gracefully (503 on contact, logged).
