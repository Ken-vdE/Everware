# Everware

Static marketing site for Everware — Dutch custom software, AI & autonomous agents agency.
Plain HTML/CSS/JS, no framework, no build dependencies beyond Node.

## Structure

```
index.html          Dutch page (source of truth for all content)
en/index.html       English page — GENERATED, do not edit by hand
assets/main.js      Interactivity + the nl/en translation table (`copy`)
assets/style.css    Responsive rules, hover/focus states
scripts/build-en.js Generates en/index.html from index.html + copy.en
sitemap.xml         Both language URLs with hreflang alternates
robots.txt          Points crawlers to the sitemap
```

## Languages & SEO

Dutch is the main language and lives at `/`. English is a fully static,
independently indexable page at `/en/`:

- Every translatable element in `index.html` carries a `data-t="key"`
  (or `data-t-ph` for input placeholders) resolving into the `copy`
  object in `assets/main.js`. Dutch text is baked into the HTML;
  English text is baked into the generated `en/index.html`.
- The NL/EN header toggle is a plain link between `/` and `/en/`,
  so crawlers discover both pages without JavaScript.
- Both pages declare `rel="canonical"` plus `hreflang` alternates
  (`nl`, `en`, `x-default` → Dutch). `og:*` tags are per-language.

### Editing content

1. Edit the Dutch text in `index.html` **and** the matching key in
   `copy.nl` in `assets/main.js` (JS re-applies strings at runtime,
   so they must stay in sync).
2. Update the English translation in `copy.en`.
3. Regenerate the English page:

   ```sh
   node scripts/build-en.js
   ```

   The script fails if a `data-t` key has no translation.

### Domain

`https://everware.nl` is hardcoded in `index.html` (head), `scripts/build-en.js`
(`SITE_URL`), `sitemap.xml` and `robots.txt`. Update all four when the domain changes.

## Hosting

Any static host. Requirements:

- Serve `en/index.html` for `/en/` (standard directory index behaviour).
- No server-side code needed. The contact form is front-end only —
  wire it to a backend or form service before launch.

## Development

```sh
python3 -m http.server 8080   # then open http://localhost:8080
```
