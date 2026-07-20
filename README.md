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
Resend-verified sender; `onboarding@resend.dev` works for testing).

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
