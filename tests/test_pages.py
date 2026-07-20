"""Tests for the translation source and the startup-rendered pages."""

import json
import re
from pathlib import Path

from fastapi.testclient import TestClient

from server.main import app  # importing renders the pages

ROOT = Path(__file__).resolve().parent.parent
COPY = json.loads((ROOT / "content" / "copy.json").read_text(encoding="utf-8"))
client = TestClient(app)

JSONLD_RE = re.compile(
    r'<script type="application/ld\+json">\s*(.*?)\s*</script>', re.S
)


def shape(node):
    """Recursive structure fingerprint: same keys, same list lengths, same leaf types."""
    if isinstance(node, dict):
        return {k: shape(v) for k, v in node.items()}
    if isinstance(node, list):
        return [shape(v) for v in node]
    return type(node).__name__


def test_copy_has_exactly_two_languages():
    assert set(COPY) == {"nl", "en"}


def test_nl_en_have_identical_structure():
    # A key added to one language can't silently miss the other.
    assert shape(COPY["nl"]) == shape(COPY["en"])


def test_nav_aria_key_present():
    assert COPY["nl"]["navAria"] == "Hoofdnavigatie"
    assert COPY["en"]["navAria"] == "Main navigation"


def test_dutch_page_rendered_from_copy():
    r = client.get("/")
    assert r.status_code == 200
    assert '<html lang="nl">' in r.text
    # chosen keys contain no &/'/< so autoescape can't alter them
    assert COPY["nl"]["capH2"] in r.text
    assert COPY["nl"]["heroCta1"] in r.text
    assert 'data-t="' not in r.text
    assert 'data-t-ph="' not in r.text
    assert 'href="assets/style.css"' in r.text
    assert '<link rel="canonical" href="https://everware.nl/">' in r.text


def test_english_page_rendered_from_copy():
    r = client.get("/en/")
    assert r.status_code == 200
    assert '<html lang="en">' in r.text
    assert COPY["en"]["wpH2"] in r.text
    assert COPY["en"]["heroCta1"] in r.text
    assert 'href="../assets/style.css"' in r.text
    assert '<link rel="canonical" href="https://everware.nl/en/">' in r.text
    assert 'aria-label="Main navigation"' in r.text


def test_jsonld_valid_and_localized():
    for path_, lang in (("/", "nl"), ("/en/", "en")):
        m = JSONLD_RE.search(client.get(path_).text)
        assert m, f"no JSON-LD block on {path_}"
        data = json.loads(m.group(1))
        types = {n["@type"] for n in data["@graph"]}
        assert types == {"ProfessionalService", "WebSite", "WebPage", "FAQPage"}
        faq = next(n for n in data["@graph"] if n["@type"] == "FAQPage")
        assert faq["inLanguage"] == lang
        assert len(faq["mainEntity"]) == len(COPY[lang]["faqItems"])


def test_typing_words_baked_into_page():
    for path_, lang in (("/", "nl"), ("/en/", "en")):
        m = re.search(r"data-words='([^']+)'", client.get(path_).text)
        assert m, f"no data-words attribute on {path_}"
        assert json.loads(m.group(1)) == COPY[lang]["words"]


def test_active_language_button_styled_per_page():
    nl_page = client.get("/").text
    en_page = client.get("/en/").text
    assert re.search(r'id="ew-lang-nl"[^>]*font-weight:600', nl_page)
    assert re.search(r'id="ew-lang-en"[^>]*font-weight:600', en_page)


def test_og_image_alt_from_copy():
    for path_, lang in (("/", "nl"), ("/en/", "en")):
        page = client.get(path_).text
        assert f'<meta property="og:image:alt" content="{COPY[lang]["ogImageAlt"]}"' in page


def test_submit_button_survives_html_minification():
    """The deployed HTML minifier strips the redundant type="submit" attribute
    (submit is a form button's default), so the contact-form JS must select the
    button by a stable id — not by `button[type="submit"]`, which returned null
    on the minified page and threw setting `.disabled`."""
    import minify_html
    from server import render

    js = (render.PUBLIC / "assets" / "main.js").read_text(encoding="utf-8")
    tpl = (ROOT / "templates" / "index.html.j2").read_text(encoding="utf-8")

    assert "getElementById('ew-submit')" in js
    assert 'button[type="submit"]' not in js
    assert 'id="ew-submit"' in tpl

    # prove the old selector really would break post-minification
    mini = minify_html.minify('<button type="submit">x</button>', minify_js=False, minify_css=False)
    assert "type=submit" not in mini and 'type="submit"' not in mini


def test_render_logs_pages(caplog):
    from server import render

    with caplog.at_level("INFO", logger="everware.render"):
        render.render_pages()
    assert "site_url=" in caplog.text
    assert "public/index.html" in caplog.text
    assert "public/en/index.html" in caplog.text
    assert "render complete" in caplog.text


def test_site_url_env_override(monkeypatch):
    from server import render

    monkeypatch.setenv("SITE_URL", "https://staging.everware.nl")
    try:
        render.render_pages()
        for out, canonical in (
            (render.PUBLIC / "index.html", "https://staging.everware.nl/"),
            (render.PUBLIC / "en" / "index.html", "https://staging.everware.nl/en/"),
        ):
            html = out.read_text(encoding="utf-8")
            assert f'<link rel="canonical" href="{canonical}">' in html
            assert 'content="https://staging.everware.nl/assets/og-image.png"' in html
            assert '<link rel="alternate" hreflang="nl" href="https://staging.everware.nl/">' in html
            # no prod URL may survive in links/metas (mailto/tel text is fine)
            assert 'href="https://everware.nl' not in html
            assert 'content="https://everware.nl' not in html
            assert '"https://staging.everware.nl/#org"' in html  # JSON-LD follows too
    finally:
        # restore prod-rendered pages for the rest of the suite
        monkeypatch.delenv("SITE_URL", raising=False)
        render.render_pages()
