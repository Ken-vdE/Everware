"""FastAPI wrapper: serves the static site from public/ and handles the contact form."""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.gzip import GZipMiddleware

from server.render import render_pages

PUBLIC = Path(__file__).resolve().parent.parent / "public"
RESEND_URL = "https://api.resend.com/emails"

# The site's own canonical host (derived from SITE_URL). Only "www.<this>" is
# ever redirected to the apex; any other Host header is served as-is and never
# reflected back into a Location, so the redirect can't be turned into an
# open-redirect primitive from the public *.run.app endpoint.
CANONICAL_HOST = urlparse(os.getenv("SITE_URL", "https://everware.nl")).hostname or "everware.nl"

LOG_DIR = Path(os.getenv("LOG_DIR", Path(__file__).resolve().parent.parent / "logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "everware.log"
LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"

logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("everware")
if not any(isinstance(h, RotatingFileHandler) for h in logger.handlers):
    _file_handler = RotatingFileHandler(LOG_FILE, maxBytes=1_000_000, backupCount=5)
    _file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(_file_handler)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

# Compress text responses (HTML/CSS/JS/JSON). Cloud Run does no compression at
# the platform for domain-mapped services, so it must happen here. See README
# "Compression" for why a CDN would take this over at higher scale.
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.middleware("http")
async def redirect_www_to_apex(request: Request, call_next):
    """301 www.<canonical host> → apex, so there is one canonical host. Only the
    site's own www host is redirected; the target is built from the trusted
    CANONICAL_HOST constant, never from the raw Host header."""
    host = request.headers.get("host", "").split(":", 1)[0].lower()
    if host == f"www.{CANONICAL_HOST}":
        target = f"https://{CANONICAL_HOST}{request.url.path}"
        if request.url.query:
            target += f"?{request.url.query}"
        return RedirectResponse(target, status_code=301)
    return await call_next(request)


@app.middleware("http")
async def noindex_when_staging(request: Request, call_next):
    """Keep the staging environment out of search indexes."""
    response = await call_next(request)
    if os.getenv("ENVIRONMENT") == "staging":
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


@app.exception_handler(Exception)
async def log_unhandled_exception(request: Request, exc: Exception):
    logger.error(
        "unhandled exception on %s from %s",
        request.url.path,
        request.client.host if request.client else "?",
        exc_info=exc,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.exception_handler(RequestValidationError)
async def log_validation_error(request: Request, exc: RequestValidationError):
    logger.warning(
        "validation error on %s from %s: %s; body=%r",
        request.url.path,
        request.client.host if request.client else "?",
        exc.errors(),
        exc.body,
    )
    return await request_validation_exception_handler(request, exc)


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    company: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    website: str = ""  # honeypot — humans never see or fill this field


@app.post("/api/contact")
async def contact(msg: ContactIn, request: Request):
    client_ip = request.client.host if request.client else "?"

    if msg.website:
        # Bot filled the honeypot: pretend success so it doesn't adapt.
        logger.info("honeypot tripped from %s (email=%s)", client_ip, msg.email)
        return {"ok": True}

    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("contact submission from %s but RESEND_API_KEY is not set", client_ip)
        raise HTTPException(status_code=503, detail="Contact form not configured")

    to = os.getenv("CONTACT_TO", "hallo@everware.nl")
    sender = os.getenv("CONTACT_FROM", "onboarding@resend.dev")
    company = f"\nCompany: {msg.company}" if msg.company else ""

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": sender,
                    "to": [to],
                    "reply_to": [msg.email],
                    "subject": f"Contact form: {msg.name}",
                    "text": (
                        f"Name: {msg.name}\nEmail: {msg.email}{company}\n\n{msg.message}"
                    ),
                },
            )
    except httpx.HTTPError:
        logger.exception(
            "Resend request failed; lost submission: name=%r email=%s company=%r message=%r",
            msg.name, msg.email, msg.company, msg.message[:500],
        )
        raise HTTPException(status_code=503, detail="Email delivery failed")

    if r.is_error:
        logger.error(
            "Resend returned %s: %s; lost submission: name=%r email=%s company=%r message=%r",
            r.status_code, r.text, msg.name, msg.email, msg.company, msg.message[:500],
        )
        raise HTTPException(status_code=503, detail="Email delivery failed")

    logger.info("contact email sent for %s (resend id=%s)", msg.email, r.json().get("id"))
    return {"ok": True}


class CachedStatic(StaticFiles):
    """StaticFiles with explicit Cache-Control. Fonts have stable filenames and
    CSS/JS are requested with a ?v=<content-hash> (see render.py), so both are
    safe to cache for a year immutable. HTML is revalidated every load so a new
    deploy's ?v refs are picked up immediately."""

    async def get_response(self, path, scope):
        resp = await super().get_response(path, scope)
        if path.lower().endswith((".woff2", ".css", ".js")):
            resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            resp.headers["Cache-Control"] = "no-cache"
        return resp


# Render the static pages once at startup (fails loud on a missing key),
# then mount last: everything not matched above is served from public/.
render_pages()
app.mount("/", CachedStatic(directory=PUBLIC, html=True), name="site")
