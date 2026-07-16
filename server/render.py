"""Renders public/index.html (nl) and public/en/index.html (en) from
templates/index.html.j2 + content/copy.json. Called once at startup by
server.main — serving stays fully static afterwards."""

import json
import logging
import os
import time
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
DEFAULT_SITE_URL = "https://everware.nl"

# Child of the "everware" logger configured in server.main — records propagate
# to its stderr + rotating-file handlers.
logger = logging.getLogger("everware.render")


def site_url() -> str:
    """Base URL without trailing slash; override with SITE_URL for staging."""
    return os.getenv("SITE_URL", DEFAULT_SITE_URL).rstrip("/")


def jsonld(lang: str, t: dict, url_path: str, site: str) -> str:
    url = site + url_path
    graph = [
        {
            "@type": "ProfessionalService",
            "@id": site + "/#org",
            "name": "Everware",
            "url": site + "/",
            "description": t["metaDesc"],
            "slogan": t["ftTagline"],
            "email": "hallo@everware.nl",
            "telephone": "+31612345678",
            "identifier": {"@type": "PropertyValue", "propertyID": "KvK", "value": "89042786"},
            "areaServed": {"@type": "Country", "name": "Netherlands"},
            "knowsLanguage": ["nl", "en"],
            "knowsAbout": [
                "custom software development", "AI solutions", "autonomous AI agents",
                "process automation", "LLM applications", "RAG",
                "software architecture", "process optimization",
            ],
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": t["svH2"],
                "itemListElement": [
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Service",
                            "name": c["title"],
                            "description": c["desc"],
                            "provider": {"@id": site + "/#org"},
                        },
                    }
                    for c in t["svCards"]
                ],
            },
        },
        {
            "@type": "WebSite",
            "@id": site + "/#website",
            "url": site + "/",
            "name": "Everware",
            "publisher": {"@id": site + "/#org"},
            "inLanguage": ["nl", "en"],
        },
        {
            "@type": "WebPage",
            "@id": url,
            "url": url,
            "name": t["title"],
            "description": t["metaDesc"],
            "isPartOf": {"@id": site + "/#website"},
            "about": {"@id": site + "/#org"},
            "inLanguage": lang,
        },
        {
            "@type": "FAQPage",
            "@id": url + "#faq",
            "inLanguage": lang,
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": f["q"],
                    "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
                }
                for f in t["faqItems"]
            ],
        },
    ]
    payload = json.dumps(
        {"@context": "https://schema.org", "@graph": graph},
        indent=2,
        ensure_ascii=False,
    )
    payload = payload.replace("<", "\\u003C")  # never allow </script> breakout inside JSON strings
    return '<script type="application/ld+json">\n' + payload + "\n</script>"


def render_pages() -> None:
    start = time.perf_counter()
    copy = json.loads((ROOT / "content" / "copy.json").read_text(encoding="utf-8"))
    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=True,
        undefined=StrictUndefined,
    )
    template = env.get_template("index.html.j2")
    site = site_url()
    logger.info("rendering pages (site_url=%s)", site)
    pages = [
        ("nl", PUBLIC / "index.html", "/", "assets/", "./", "en/"),
        ("en", PUBLIC / "en" / "index.html", "/en/", "../assets/", "../", "./"),
    ]
    for lang, out, url_path, asset_prefix, nl_href, en_href in pages:
        t = copy[lang]
        html = template.render(
            lang=lang,
            t=t,
            site_url=site,
            canonical=site + url_path,
            og_locale="nl_NL" if lang == "nl" else "en_US",
            og_locale_alt="en_US" if lang == "nl" else "nl_NL",
            asset_prefix=asset_prefix,
            nl_href=nl_href,
            en_href=en_href,
            jsonld=Markup(jsonld(lang, t, url_path, site)),
        )
        out.parent.mkdir(parents=True, exist_ok=True)
        # Atomic replace: a respawning worker must never expose a truncated
        # page to a sibling worker serving from the same directory.
        tmp = out.with_suffix(".tmp")
        tmp.write_text(html, encoding="utf-8")
        tmp.replace(out)
        logger.info("rendered %s (%s, %d bytes)", out.relative_to(ROOT), lang, len(html))
    logger.info("render complete in %.0f ms", (time.perf_counter() - start) * 1000)
