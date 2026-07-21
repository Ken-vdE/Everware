# Everware

Marketing site for Everware — Dutch custom software, AI & autonomous agents agency.
Static HTML/CSS/JS in `public/`, wrapped by a small FastAPI app that serves the
site and handles the contact form (via [Resend](https://resend.com)).

## Structure

```
content/copy.json      ALL site copy, nl + en — the single translation source
templates/index.html.j2 Single page template (Jinja2) for both languages
public/index.html      Dutch page — GENERATED at server startup, untracked
public/en/index.html   English page — GENERATED at server startup, untracked
public/assets/main.js  Interactivity (typing, glows, canvas, form) — no copy
public/assets/style.css Responsive rules, hover/focus states
public/sitemap.xml     Both language URLs with hreflang alternates
public/robots.txt      Points crawlers to the sitemap
public/llms.txt        Machine-readable site summary for LLM crawlers
public/assets/og-image.png Social share image (1200×630); source: scripts/og-image.html
server/main.py         FastAPI app: POST /api/contact + static mount of public/
server/render.py       Renders both pages from template + copy.json at startup
scripts/og-image.html  Source page for the og-image render
tests/test_server.py   API + static-serving tests (pytest)
tests/test_pages.py    Translation-source + rendered-page tests (pytest)
pyproject.toml         Python project (uv)
.env.example           Template for required environment variables
```

## Backend

`server/main.py` is intentionally tiny:

- `POST /api/contact` — validates `{name, email, company?, message}` and
  forwards it via the Resend API. A hidden `website` honeypot field silently
  drops bot submissions. Returns 503 if Resend fails or no API key is
  configured. Every rejected or failed request — including unhandled
  exceptions (500, with traceback) — is logged (logger `everware`);
  delivery failures log the full submission so no lead is lost. Logs go to
  stderr and to `logs/everware.log` (rotating, 1 MB × 5; override the
  directory with `LOG_DIR`).
- Everything else is served from `public/` (`StaticFiles`, `html=True`), so
  adding a file to `public/` publishes it — no route needed. Swagger/OpenAPI
  endpoints are disabled.

Configuration (see `.env.example`): `RESEND_API_KEY` (required for sending),
`CONTACT_TO` (default `hallo@everware.nl`), `CONTACT_FROM` (must be a
Resend-verified sender; `onboarding@resend.dev` works for testing). On Cloud Run
both `RESEND_API_KEY` and `CONTACT_FROM` are injected from Secret Manager
(`resend-api-key-<env>`, `contact-from-<env>`) — never set in Terraform files.
Locally they come from `.env`.

## Development

```sh
uv sync                          # once: install dependencies
cp .env.example .env             # fill in RESEND_API_KEY
uv run --env-file .env uvicorn server.main:app --reload \
  --reload-include '*.json' --reload-include '*.j2'        # http://localhost:8000
uv run pytest                    # run the test suite
```

The `--reload-include` flags make uvicorn watch `content/copy.json` and
`templates/*.j2` on top of the default `*.py`; editing either restarts the
server, which reruns `render_pages()` and regenerates both pages.

The contact form degrades cleanly without a key: the API returns 503 and the
form shows its error line.

## Languages & SEO

Dutch is the main language and lives at `/`. English is a fully static,
independently indexable page at `/en/`:

- Both pages are rendered from `templates/index.html.j2` at server startup
  (`server/render.py`), with all strings coming from `content/copy.json`
  (`{"nl": {...}, "en": {...}}`). A missing key aborts startup
  (`StrictUndefined`), so the languages can't drift apart.
- The NL/EN header toggle is a plain link between `/` and `/en/`,
  so crawlers discover both pages without JavaScript.
- Both pages declare `rel="canonical"` plus `hreflang` alternates
  (`nl`, `en`, `x-default` → Dutch). `og:*` tags are per-language.

### Editing content

1. Edit the text in `content/copy.json` — both languages live there, side by
   side. Layout/markup changes go in `templates/index.html.j2` instead.
2. Restart the server (or run `uv run pytest`) — both pages are re-rendered
   at startup. The dev command above already watches these files, so a save
   re-renders both pages automatically. A key missing in either language makes
   startup fail with the key name.

### Domain

The base URL for canonical/og/hreflang links and JSON-LD comes from the
`SITE_URL` environment variable (default `https://everware.nl`, see
`.env.example`) — set it on staging to render staging URLs. Still hardcoded:
`public/sitemap.xml` and `public/robots.txt` (and the contact email
`hallo@everware.nl` in copy/template). Update those when the domain changes.

### Structured data & AI indexation

- JSON-LD (`ProfessionalService`, `WebSite`, `WebPage`, `FAQPage`) is
  GENERATED per language by `server/render.py` from `content/copy.json` at
  startup. Never hand-edit the `<script type="application/ld+json">` blocks —
  edit the copy and restart.
- `public/llms.txt` is a hand-written English summary for LLM crawlers
  (llmstxt.org convention). Update it when services/contact facts change.
- `public/robots.txt` explicitly allows the major AI crawlers.
- Bump `<lastmod>` in `public/sitemap.xml` on every content change.
- Regenerate the og-image after brand changes:

  ```sh
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless --disable-gpu --hide-scrollbars \
    --window-size=1200,630 --virtual-time-budget=10000 \
    --screenshot=public/assets/og-image.png "file://$PWD/scripts/og-image.html"
  ```

## Hosting

Run the FastAPI app behind any ASGI-capable setup, e.g.:

```sh
uv run --env-file .env uvicorn server.main:app --host 0.0.0.0 --port 8000
```

After a server start has rendered the pages, the `public/` directory also still works on any static host if the contact
form is pointed at a hosted `/api/contact` (or disabled) — nothing in the
HTML depends on the Python server except that endpoint.

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

# 3. Configure Terraform ONCE — a single terraform.tfvars and a single
#    backend.hcl are each symlinked into all three root modules (shared,
#    staging, prod), so no -var flags and no per-dir copies:
cp infra/terraform.tfvars.example infra/terraform.tfvars   # then edit: project_id + billing_account
cp infra/backend.hcl.example      infra/backend.hcl        # then edit: bucket = <PROJECT_ID>-tfstate
#    Then apply shared infra (APIs incl. monitoring, Artifact Registry, WIF,
#    deploy SA, AR reader, and the project billing budget). The budget needs
#    billing perms — run this as a user with roles/billing.costsManager on the
#    billing account, NOT the deploy SA:
cd infra/shared
terraform init -backend-config=backend.hcl
terraform apply

# 4. Set these as GitHub repo Actions *Variables*:
#    GCP_PROJECT_ID = <PROJECT_ID>
#    WIF_PROVIDER   = $(terraform output -raw wif_provider)
#    DEPLOY_SA      = $(terraform output -raw deploy_service_account)
#    And these as repo Actions *Secrets* for deploy notifications (optional):
#    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID    (see "Monitoring & alerting")

# 5. Verify domain ownership BEFORE applying the environments (domain mappings
#    require a verified domain). Verify everware.nl, www.everware.nl,
#    staging.everware.nl in Google Search Console for the deploying account.

# 6. For EACH environment (staging first, then prod): create the two secret
#    containers, seed both, then apply. project_id already comes from the shared
#    infra/terraform.tfvars via the symlink — no -var needed. Secret values
#    (Resend key, CONTACT_FROM sender) are never committed to git.
cd ../environments/staging
terraform init -backend-config=backend.hcl
terraform apply \
  -target=module.app.google_secret_manager_secret.resend \
  -target=module.app.google_secret_manager_secret.contact_from    # empty containers only
printf '%s' "<RESEND_KEY>"            | gcloud secrets versions add resend-api-key-staging --data-file=-
printf '%s' "onboarding@resend.dev"   | gcloud secrets versions add contact-from-staging  --data-file=-
terraform apply    # full: service (secrets now resolve) + domain mapping (domain verified)

cd ../prod
terraform init -backend-config=backend.hcl
terraform apply \
  -target=module.app.google_secret_manager_secret.resend \
  -target=module.app.google_secret_manager_secret.contact_from
printf '%s' "<RESEND_KEY>"            | gcloud secrets versions add resend-api-key-prod --data-file=-
printf '%s' "onboarding@resend.dev"   | gcloud secrets versions add contact-from-prod  --data-file=-
terraform apply

# 7. Set the DNS records Cloud Run reports for each mapped domain:
gcloud beta run domain-mappings describe --domain=staging.everware.nl --region=europe-west4
#    Add the returned records at the registrar for each domain.
```

### Deploy

```bash
git push origin staging   # → staging
# promote by merging staging → main:
git push origin main       # → prod
```

Images are tagged by commit SHA in Artifact Registry. Terraform ignores the running
image, so `terraform apply` never reverts a CI deploy.

### Running Terraform (and a future upgrade path)

Today, **infrastructure changes are applied from a developer's machine**:
`terraform apply` runs locally under the engineer's user credentials (Application
Default Credentials — note `user_project_override` in each `versions.tf`). The
_state_ is already remote and shared (GCS bucket, see [Backend](#backend)), so this
is fine for a solo/small setup and there is no state-on-laptop risk. But the
_credentials to change prod_ live on whoever last ran `apply`, and there is no
central record of who applied what.

This is normal at small scale. The mature pattern is to let CI run Terraform so no
human holds standing infrastructure credentials — and the good news is **this repo
is already 90% of the way there**: app deploys (`.github/workflows/deploy.yml`)
already authenticate to GCP keyless via **Workload Identity Federation** (`WIF_PROVIDER`
+ the deploy service account), with no service-account JSON key anywhere. The same
mechanism can run Terraform.

**The upgrade, when it's worth it:**

1. **Plan on PRs, apply on merge.** Add a `terraform` GitHub Actions workflow that
   runs `terraform plan` on pull requests (posting the plan as a PR comment) and
   `terraform apply` only after merge to `staging` / `main`, gated on a required
   review or a GitHub **Environment** protection rule. Human approval stays in the
   loop; execution moves off laptops.
2. **Reuse the existing WIF trust.** The workflow authenticates with
   `google-github-actions/auth@v2` exactly like `deploy.yml` — grant the WIF
   principal (or a dedicated `terraform` service account) the roles Terraform needs
   (`roles/editor` or a tighter custom role, plus billing for the budget). No new
   key files.
3. **Then nobody needs local prod creds.** A compromised laptop leaks nothing;
   every change is a reviewable, logged CI run. Engineers can still `terraform plan`
   locally for fast iteration.

The trade-off is setup effort and slower feedback (a change ships through CI, not an
instant local `apply`), which is why it's deliberately deferred until infra changes
often enough — or the team grows enough — to justify it. Managed options
(Terraform Cloud, Spacelift, Atlantis) do the same thing as a SaaS if building the
workflow isn't worth it, but plain GitHub Actions + the WIF trust already in place is
free and the natural next step here.

### Monitoring & alerting

Two independent layers, so a broken deploy or a degraded site surfaces without
anyone watching a dashboard.

**Deploy notifications (GitHub Actions → Telegram).** `.github/workflows/deploy.yml`
pings Telegram when a deploy starts and when it succeeds/fails, with a link to the
run. Needs two repo Actions secrets: `TELEGRAM_BOT_TOKEN` (from @BotFather) and
`TELEGRAM_CHAT_ID` (DM @userinfobot for your id). If the secrets are absent the
curl no-ops — the deploy still runs.

**Runtime alerts (Cloud Monitoring, per service).** Defined in Terraform
(`infra/modules/app/monitoring.tf`) so both environments get them. They email the
`alert_email` variable — set once in `infra/terraform.tfvars` (gitignored, so the
address is never committed); empty disables runtime alerts. Use an address that
actually routes (a plus-alias is fine) or alerts vanish silently.

- **Uptime** — HTTPS `/` every 15m (GCP's max interval), SSL validated; fires if
  >1 probe region fails. Also catches cert expiry.
- **5xx** rate, **4xx** rate (high threshold — dodges bot/404 noise), **p95
  latency**, **CPU**, **memory**, **max-instances reached** (saturation), and
  **slow container startup**.
- **Log-based:** **contact-form failure** (a lost lead — matches the app's
  "lost submission" / missing-key log lines) and **unhandled exceptions**. Cloud
  Run tags all stderr as ERROR, so these match on log *text*, not severity.

Thresholds are module variables (`alert_*` in `infra/modules/app/variables.tf`);
the probe interval is `uptime_period`, the probed host `uptime_host`.

**Billing budget (project-wide).** `infra/shared/budget.tf` creates a monthly
budget (`monthly_budget`, default €10) emailing at 50/90/100% — a runaway-cost
guard. Skipped unless `billing_account` is set.

**Cost ≈ €0.** Cloud Run system metrics are free; uptime at 15m is ~2,900
probes/mo (free tier: 1M); with `min_instances = 0` and request-based billing the
probes add no standing charge. Only alerting-policy time-series volume could ever
bill, and it's cents at most — check Billing → Reports (service: Cloud Monitoring)
after month one.

### Networking (no VPC)

There is no VPC. The app is stateless and reaches everything over Cloud Run's
default managed networking: public ingress (`allUsers` invoker), public egress to
the Resend API, and Secret Manager over Google APIs. `infra/` contains no
`google_compute_network`, subnet, Serverless VPC Access connector, Direct VPC
egress, or Cloud NAT.

Add VPC networking only when a private resource is introduced — Cloud SQL / AlloyDB
over private IP, Memorystore (Redis), a static egress IP via Cloud NAT, or reaching
internal-only services. That is done with a Serverless VPC Access connector or
Direct VPC egress on the Cloud Run service.

### Compression

Responses are gzip-compressed in the **app** — `GZipMiddleware` in `server/main.py`
(`minimum_size=500`). This lives in the app on purpose: Cloud Run does no
compression at the platform level for domain-mapped services, and
`google_cloud_run_v2_service` has no compression setting, so Terraform cannot add
it here. App-level gzip is the right tool at this scale — it cuts the ~57 KB HTML to
~10–12 KB for one line of code and no infrastructure.

**Why a CDN could take this over later.** If the site grows (more traffic, heavier
assets, a global audience), move compression to the edge by fronting Cloud Run with
a **Global external Application Load Balancer + Cloud CDN**. On the backend service,
`enable_cdn = true` with `compression_mode = "AUTOMATIC"` gives edge gzip/brotli —
and, unlike app-level gzip, it also:

- **caches** static assets at Google's edge (no container hit, no re-compression per
  request — app gzip re-compresses on every response),
- serves from **points of presence near the user** (lower latency worldwide),
- enables **brotli** (smaller than gzip) and HTTP/3, plus Cloud Armor / WAF.

The trade-off is cost and complexity: the ALB has a ~€18/mo floor and **replaces the
domain mapping** with the full LB stack (serverless NEG, backend service, URL map,
target HTTPS proxy, managed cert, forwarding rule). Not worth it for a low-traffic
marketing site, but it's the natural upgrade path — and it would also unlock
multi-region failover (e.g. `europe-west4` primary + `europe-west1`) at the same
time. Until then, app-level gzip is deliberately the pragmatic choice.

### Notes

- **Rotating the Resend key:** adding a new secret version does not restart running
  instances (the `latest` ref is read at instance start). After
  `gcloud secrets versions add …`, trigger a new revision — push the branch again, or
  `gcloud run services update everware-<env> --region europe-west4`.
- **Deploy to the run.app URL first:** to bring a service up before its domain is
  verified, set `domains = []` in that env's `main.tf`, apply, then restore the domain
  list and re-apply once the domain is verified (avoids a failed domain-mapping apply).
