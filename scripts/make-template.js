#!/usr/bin/env node
// ONE-OFF migration: convert public/index.html (Dutch source of truth) into
// templates/index.html.j2. Mirrors the replacement logic of scripts/build-en.js
// but emits Jinja expressions instead of English text.
// After this runs once, the TEMPLATE is the source of truth; delete this script.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://everware.nl';

let html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

// data-t key path ("nav.0.label") -> Jinja expression ("t.nav[0].label")
const expr = (key) =>
  't' + key.split('.').map((s) => (/^\d+$/.test(s) ? `[${s}]` : `.${s}`)).join('');

// ---- head: language, title, metas, canonical, locales, JSON-LD slot ----
html = html
  .replace('<html lang="nl">', '<html lang="{{ lang }}">')
  .replace(/<title>[^<]*<\/title>/, '<title>{{ t.title }}</title>')
  .replace(/(<meta name="description" content=")[^"]*(")/, '$1{{ t.metaDesc }}$2')
  .replace(/(<meta property="og:title" content=")[^"]*(")/, '$1{{ t.title }}$2')
  .replace(/(<meta property="og:description" content=")[^"]*(")/, '$1{{ t.ogDesc }}$2')
  .replace(/(<meta name="twitter:title" content=")[^"]*(")/, '$1{{ t.title }}$2')
  .replace(/(<meta name="twitter:description" content=")[^"]*(")/, '$1{{ t.ogDesc }}$2')
  .replace(`<meta property="og:url" content="${SITE_URL}/">`, '<meta property="og:url" content="{{ canonical }}">')
  .replace('<meta property="og:locale" content="nl_NL">', '<meta property="og:locale" content="{{ og_locale }}">')
  .replace('<meta property="og:locale:alternate" content="en_US">', '<meta property="og:locale:alternate" content="{{ og_locale_alt }}">')
  .replace(`<link rel="canonical" href="${SITE_URL}/">`, '<link rel="canonical" href="{{ canonical }}">')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '{{ jsonld }}');

// ---- asset paths (nl: "assets/", en: "../assets/") ----
html = html
  .replace('href="assets/style.css"', 'href="{{ asset_prefix }}style.css"')
  .replace('src="assets/main.js"', 'src="{{ asset_prefix }}main.js"');

// ---- language toggle: hrefs + active styling (was JS in applyLang) ----
html = html
  .replace(
    '<a id="ew-lang-nl" class="ew-langbtn" href="./" style="text-decoration:none">NL</a>',
    '<a id="ew-lang-nl" class="ew-langbtn" href="{{ nl_href }}" style="text-decoration:none{% if lang == \'nl\' %};color:#3B82F6;opacity:1;font-weight:600{% else %};opacity:.5;font-weight:400{% endif %}">NL</a>'
  )
  .replace(
    '<a id="ew-lang-en" class="ew-langbtn" href="en/" style="text-decoration:none">EN</a>',
    '<a id="ew-lang-en" class="ew-langbtn" href="{{ en_href }}" style="text-decoration:none{% if lang == \'en\' %};color:#3B82F6;opacity:1;font-weight:600{% else %};opacity:.5;font-weight:400{% endif %}">EN</a>'
  )
  .replace('aria-label="Hoofdnavigatie"', 'aria-label="{{ t.navAria }}"');

// ---- typing rotator words for main.js (replaces the shipped copy object) ----
html = html.replace(
  '<span id="ew-typed" ',
  "<span id=\"ew-typed\" data-words='{{ t.words | tojson }}' "
);

// ---- every data-t leaf: text content -> Jinja expression, drop the attribute ----
// (all data-t elements contain text only — same invariant build-en.js relies on)
html = html.replace(
  /<([a-z0-9]+)([^>]*?) ?data-t="([^"]+)"([^>]*)>([^<]*)/g,
  (m, tag, pre, key, post) => `<${tag}${pre}${post}>{{ ${expr(key)} }}`
);

// ---- placeholders: data-t-ph -> Jinja in placeholder=, drop the attribute ----
html = html.replace(/<(?:input|textarea)[^>]*>/g, (tag) => {
  const mm = tag.match(/ data-t-ph="([^"]+)"/);
  if (!mm) return tag;
  return tag
    .replace(/placeholder="[^"]*"/, `placeholder="{{ ${expr(mm[1])} }}"`)
    .replace(mm[0], '');
});

// ---- step-letter rows: spans generated from t.wpStepWord ----
html = html.replace(
  /(<div data-letters[^>]*>)(?:<span>[^<]*<\/span>)+(<\/div>)/g,
  (m, open, close) =>
    open + '{% for ch in t.wpStepWord %}<span>{{ ch }}</span>{% endfor %}' + close
);

// ---- sanity: nothing translatable left behind ----
if (/data-t="|data-t-ph="/.test(html)) throw new Error('untranslated data-t attributes remain');

fs.mkdirSync(path.join(ROOT, 'templates'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'templates/index.html.j2'), html);
console.log('templates/index.html.j2 written (' + html.length + ' bytes)');
