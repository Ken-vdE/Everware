#!/usr/bin/env node
// Generates the static English page (en/index.html) from index.html (Dutch,
// the source of truth) and the translation table in assets/main.js.
// Run after any content change: node scripts/build-en.js
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://everware.nl';

const js = fs.readFileSync(path.join(ROOT, 'assets/main.js'), 'utf8');
const start = js.indexOf('const copy = {');
const end = js.indexOf('};', js.indexOf('ftCopyRight', js.indexOf('en: {')));
if (start === -1 || end === -1) throw new Error('copy object not found in assets/main.js');
const copy = eval('(' + js.slice(start + 'const copy = '.length, end + 1) + ')');
const t = copy.en;

const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Head: language, title and meta
html = html
  .replace('<html lang="nl">', '<html lang="en">')
  .replace(/<title>[^<]*<\/title>/, `<title>${escText(t.title)}</title>`)
  .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(t.metaDesc)}$2`)
  .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(t.title)}$2`)
  .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(t.ogDesc)}$2`)
  .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(t.title)}$2`)
  .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(t.ogDesc)}$2`)
  .replace(`<meta property="og:url" content="${SITE_URL}/">`, `<meta property="og:url" content="${SITE_URL}/en/">`)
  .replace('<meta property="og:locale" content="nl_NL">', '<meta property="og:locale" content="en_US">')
  .replace('<meta property="og:locale:alternate" content="en_US">', '<meta property="og:locale:alternate" content="nl_NL">')
  .replace(`<link rel="canonical" href="${SITE_URL}/">`, `<link rel="canonical" href="${SITE_URL}/en/">`);

// Assets live one level up from /en/
html = html
  .replace('href="assets/style.css"', 'href="../assets/style.css"')
  .replace('src="assets/main.js"', 'src="../assets/main.js"');

// Language toggle targets
html = html
  .replace('id="ew-lang-nl" class="ew-langbtn" href="./"', 'id="ew-lang-nl" class="ew-langbtn" href="../"')
  .replace('id="ew-lang-en" class="ew-langbtn" href="en/"', 'id="ew-lang-en" class="ew-langbtn" href="./"')
  .replace('aria-label="Hoofdnavigatie"', 'aria-label="Main navigation"');

// Translate every data-t leaf (all data-t elements contain text only)
const missing = [];
html = html.replace(/(<[^>]+data-t="([^"]+)"[^>]*>)([^<]*)/g, (m, open, key) => {
  const v = get(t, key);
  if (typeof v !== 'string') { missing.push(key); return m; }
  return open + escText(v);
});

// Translate placeholders (placeholder="..." precedes data-t-ph in the same tag)
html = html.replace(/<(?:input|textarea)[^>]*data-t-ph="([^"]+)"[^>]*>/g, (tag, key) => {
  const v = get(t, key);
  if (typeof v !== 'string') { missing.push(key); return tag; }
  return tag.replace(/placeholder="[^"]*"/, `placeholder="${escAttr(v)}"`);
});

// Step-letter rows ("stap" -> "step")
html = html.replace(/(<div data-letters[^>]*>)(?:<span>[^<]*<\/span>)+(<\/div>)/g,
  (m, open, close) => open + [...t.wpStepWord].map(c => `<span>${escText(c)}</span>`).join('') + close);

if (missing.length) throw new Error('untranslated keys: ' + missing.join(', '));

fs.mkdirSync(path.join(ROOT, 'en'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'en/index.html'), html);
console.log('en/index.html written (' + html.length + ' bytes)');
