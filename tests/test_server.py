import httpx
import respx
from fastapi.testclient import TestClient
from httpx import Response

from server.main import LOG_FILE, app

client = TestClient(app)

RESEND_URL = "https://api.resend.com/emails"

VALID = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "company": "Analytical Engines BV",
    "message": "We need a custom tool for our process.",
    "website": "",
}


# ---- contact endpoint ----

@respx.mock
def test_contact_sends_via_resend(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    route = respx.post(RESEND_URL).mock(return_value=Response(200, json={"id": "email_1"}))

    r = client.post("/api/contact", json=VALID)

    assert r.status_code == 200
    assert r.json() == {"ok": True}
    sent = route.calls.last.request
    assert sent.headers["authorization"] == "Bearer re_test_123"
    body = sent.read().decode()
    assert "ada@example.com" in body
    assert "Analytical Engines BV" in body


@respx.mock
def test_honeypot_short_circuits(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    route = respx.post(RESEND_URL)

    r = client.post("/api/contact", json={**VALID, "website": "http://spam.example"})

    assert r.status_code == 200
    assert r.json() == {"ok": True}
    assert not route.called


def test_invalid_email_rejected_and_logged(monkeypatch, caplog):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    with caplog.at_level("WARNING", logger="everware"):
        r = client.post("/api/contact", json={**VALID, "email": "not-an-email"})
    assert r.status_code == 422
    assert "validation error" in caplog.text
    # full request body is logged, not just the failing field
    assert "Ada Lovelace" in caplog.text
    assert "custom tool" in caplog.text


def test_missing_message_rejected(monkeypatch, caplog):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    with caplog.at_level("WARNING", logger="everware"):
        r = client.post("/api/contact", json={k: v for k, v in VALID.items() if k != "message"})
    assert r.status_code == 422
    assert "validation error" in caplog.text


@respx.mock
def test_resend_failure_returns_503_and_logs_submission(monkeypatch, caplog):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    respx.post(RESEND_URL).mock(return_value=Response(500, json={"message": "boom"}))
    with caplog.at_level("ERROR", logger="everware"):
        r = client.post("/api/contact", json=VALID)
    assert r.status_code == 503
    # the lead must be recoverable from the logs
    assert "ada@example.com" in caplog.text
    assert "custom tool" in caplog.text


@respx.mock
def test_resend_network_error_returns_503_and_logs_submission(monkeypatch, caplog):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    respx.post(RESEND_URL).mock(side_effect=httpx.ConnectError("boom"))
    with caplog.at_level("ERROR", logger="everware"):
        r = client.post("/api/contact", json=VALID)
    assert r.status_code == 503
    assert "ada@example.com" in caplog.text


def test_unconfigured_key_returns_503_and_logged(monkeypatch, caplog):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    with caplog.at_level("ERROR", logger="everware"):
        r = client.post("/api/contact", json=VALID)
    assert r.status_code == 503
    assert "RESEND_API_KEY" in caplog.text


def test_unhandled_exception_returns_500_and_logged_to_file(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")

    def boom(*args, **kwargs):
        raise RuntimeError("kaboom-probe")

    monkeypatch.setattr("server.main.httpx.AsyncClient", boom)
    quiet_client = TestClient(app, raise_server_exceptions=False)
    r = quiet_client.post("/api/contact", json=VALID)
    assert r.status_code == 500
    assert r.json() == {"detail": "Internal Server Error"}
    log = LOG_FILE.read_text()
    assert "kaboom-probe" in log
    assert "unhandled exception on /api/contact" in log


def test_errors_written_to_log_file(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_123")
    r = client.post("/api/contact", json={**VALID, "email": "log-file-probe"})
    assert r.status_code == 422
    assert "log-file-probe" in LOG_FILE.read_text()


# ---- static serving ----

def test_root_serves_dutch_index():
    r = client.get("/")
    assert r.status_code == 200
    assert 'lang="nl"' in r.text


def test_en_serves_english_index():
    r = client.get("/en/")
    assert r.status_code == 200
    assert 'lang="en"' in r.text


def test_assets_served():
    assert client.get("/assets/style.css").status_code == 200
    assert client.get("/robots.txt").status_code == 200
    assert client.get("/sitemap.xml").status_code == 200
    assert client.get("/llms.txt").status_code == 200


def test_no_leaks_outside_public():
    assert client.get("/docs").status_code == 404          # swagger disabled
    assert client.get("/server/main.py").status_code == 404
    assert client.get("/content/copy.json").status_code == 404
    assert client.get("/templates/index.html.j2").status_code == 404
    assert client.get("/../pyproject.toml").status_code in (400, 404)


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


# ---- gzip compression ----

def test_large_response_is_gzipped_when_accepted():
    r = client.get("/", headers={"Accept-Encoding": "gzip"})
    assert r.status_code == 200
    assert r.headers.get("content-encoding") == "gzip"


def test_response_not_gzipped_when_not_accepted():
    r = client.get("/", headers={"Accept-Encoding": "identity"})
    assert "content-encoding" not in r.headers


# ---- www → apex redirect ----

def test_www_redirects_to_apex():
    r = client.get("/", headers={"host": "www.everware.nl"}, follow_redirects=False)
    assert r.status_code == 301
    assert r.headers["location"] == "https://everware.nl/"


def test_www_redirect_preserves_path_and_query():
    r = client.get("/en/?ref=x", headers={"host": "www.everware.nl"}, follow_redirects=False)
    assert r.status_code == 301
    assert r.headers["location"] == "https://everware.nl/en/?ref=x"


def test_apex_not_redirected():
    r = client.get("/", headers={"host": "everware.nl"}, follow_redirects=False)
    assert r.status_code == 200
