# Single-source translations via Jinja2 startup render

**Date:** 2026-07-16
**Status:** Approved

## Problem

Site content is maintained in three places:

1. Dutch text hand-authored in `public/index.html`
2. Dutch text duplicated in `copy.nl` inside `public/assets/main.js`
3. English text in `copy.en` inside `public/assets/main.js` (consumed by `scripts/build-en.js` to generate `public/en/index.html`)

Every content change requires editing both `index.html` and the `copy` object, then remembering to run the Node build script. Additionally, `applyLang()` in main.js rewrites the entire DOM from `copy` at page load, which is redundant since both pages are pre-translated.

## Goal

One file holds all translations. Pages are generated from a single template at server startup. Serving stays fully static (StaticFiles with ETag/304 behavior). The Node build script and the runtime translation layer are removed.

## Design

### 1. Translation source: `content/copy.json`

- Structure: `{ "nl": { ... }, "en": { ... } }`, ported 1:1 from the `copy` object currently in `public/assets/main.js` (nested nav arrays, service cards, FAQ items, etc.).
- This is the only place translations live.
- Dev workflow: edit JSON, restart server. For auto-reload: `uvicorn --reload --reload-include '*.json' --reload-include '*.j2'`.

### 2. Template: `templates/index.html.j2`

One Jinja2 template derived from the current `public/index.html`:

- `data-t` / `data-t-ph` attributes are removed; text and placeholder slots become Jinja expressions (`{{ t.heroDesc }}`, `placeholder="{{ t.formName }}"`).
- Per-language context variables: `lang`, canonical URL, `og:url`, `og:locale` (+ alternate), asset path prefix (`assets/` vs `../assets/`), language-toggle hrefs, and active-language button styling (moves from JS to template).
- Step-letter rows (`data-letters`) render `t.wpStepWord` characters as `<span>` elements in the template loop.
- JSON-LD: the `jsonld()` graph builder from `scripts/build-en.js` (ProfessionalService, WebSite, WebPage, FAQPage) is ported to Python. Output is `json.dumps`-serialized with `<` escaped as `\u003C` (script-breakout protection preserved) and injected into the template per language.
- Typing-rotator words are exposed to JS via a data attribute: `<span id="ew-typed" data-words='{{ t.words | tojson }}'>`.

### 3. Startup render in `server/main.py`

- `render_pages()` runs at module level, before the StaticFiles mount:
  - Jinja environment with `autoescape=True` and `undefined=StrictUndefined`.
  - Renders `nl` → `public/index.html` and `en` → `public/en/index.html`.
- `StrictUndefined` means a missing translation key aborts server startup. This replaces the untranslated-keys check in `build-en.js`.
- Serving is unchanged: `StaticFiles(directory=PUBLIC, html=True)` keeps ETag/Last-Modified/304 behavior. Zero per-request render cost.
- New dependency: `jinja2` (direct dependency in `pyproject.toml`).

### 4. main.js reduction

Delete from `public/assets/main.js`:

- The `copy` object (~250 lines).
- `applyLang()` DOM rewriting (title/meta/data-t/data-t-ph/data-letters loops).
- Language-button styling logic (now template-side).

Keep:

- Typing rotator, reading its word list from `#ew-typed`'s `data-words` attribute (JSON parse) with the current-page language already baked in.
- All non-i18n behavior: header state, glows, web canvas, theme probe, contact form submit.

### 5. Cleanup

- Delete `scripts/build-en.js`.
- Add `public/index.html` and `public/en/index.html` to `.gitignore` and remove them from git tracking — they are generated artifacts now. The repo requires a server start (or test run) to produce them; acceptable since FastAPI is the deployment target.

### 6. Error handling

- Missing/invalid `content/copy.json` or missing template → exception at import time, server refuses to start (fail loud, never serve stale/partial pages silently).
- Missing key in either language → `StrictUndefined` render error at startup, names the key.

### 7. Testing

Extend `tests/test_server.py`:

- `GET /` and `GET /en/` return 200 with correct `<html lang>`.
- Rendered pages contain representative strings from `copy.json` (hero title nl/en) and a valid JSON-LD block (parses as JSON, contains `FAQPage`).
- Structural parity: `nl` and `en` key sets in `copy.json` are identical (recursive), so a key added to one language can't silently miss the other.
- Existing contact-form tests unchanged.

## Out of scope

- `scripts/og-image.html` (untouched).
- `sitemap.xml`, `robots.txt`, `llms.txt` (static, untouched).
- Any visual or content changes — rendered output must be content-equivalent to today's pages. Expected mechanical diffs only: removed `data-t`/`data-t-ph` attributes, added `data-words` attribute, template-side active-language button styling, and JSON-LD whitespace/serialization differences (`json.dumps` vs `JSON.stringify`).
