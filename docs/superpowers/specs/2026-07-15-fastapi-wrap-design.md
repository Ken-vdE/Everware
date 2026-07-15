# FastAPI wrap + Resend contact endpoint — design

Date: 2026-07-15. Approved: approach B.

## Goal

Serve the static site from a FastAPI app and give the contact form a real
backend (Resend) so the API key never reaches the browser.

## Layout

```
public/            # moved: index.html, en/, assets/, robots.txt, sitemap.xml, llms.txt
server/main.py     # FastAPI app
scripts/build-en.js  # ROOT constant -> ../public
pyproject.toml     # uv project
.env.example       # RESEND_API_KEY, CONTACT_TO, CONTACT_FROM
tests/test_server.py
```

## Server

- `POST /api/contact` — JSON `{name, email, company?, message, website}`.
  - `website` is a hidden honeypot field: non-empty → return `{"ok": true}`
    without sending (don't tip off bots).
  - Validation via pydantic (`EmailStr`, min lengths).
  - Sends via Resend HTTP API (`httpx.AsyncClient`), `reply_to` = submitter.
  - Resend failure → 502.
- `app.mount("/", StaticFiles(directory=public, html=True))` — registered
  after the API route; serves `/`, `/en/`, assets and root txt/xml files.
- Swagger docs disabled (`docs_url=None`, `redoc_url=None`) — public site.
- Config from env: `RESEND_API_KEY` (required to send), `CONTACT_TO`
  (default `hallo@everware.nl`), `CONTACT_FROM` (Resend-verified sender;
  `onboarding@resend.dev` for testing).

## Frontend

- Hidden honeypot input `website` in the form (`index.html`, flows into
  `en/index.html` via build-en).
- `assets/main.js` submit handler: `fetch('/api/contact', ...)`; success →
  existing sent panel; failure → keep form, show error line (new `ctErr`
  copy key, nl + en).

## Run

```
uv sync
uv run --env-file .env uvicorn server.main:app --reload
```

## Tests

pytest + respx (mock Resend): happy path, honeypot short-circuit,
validation errors, Resend 500 → 502, static routes (/, /en/, asset, no
/docs, no /.git or /server leakage).
