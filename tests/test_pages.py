"""Tests for the translation source and the startup-rendered pages."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COPY = json.loads((ROOT / "content" / "copy.json").read_text())


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


import re

from fastapi.testclient import TestClient

from server.main import app  # importing renders the pages

client = TestClient(app)

JSONLD_RE = re.compile(
    r'<script type="application/ld\+json">\s*(.*?)\s*</script>', re.S
)


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
