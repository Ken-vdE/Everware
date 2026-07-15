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

const JSONLD_RE = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;

function jsonld(lang, tt, urlPath) {
  const url = SITE_URL + urlPath;
  const graph = [
    {
      '@type': 'ProfessionalService',
      '@id': SITE_URL + '/#org',
      name: 'Everware',
      url: SITE_URL + '/',
      description: tt.metaDesc,
      slogan: tt.ftTagline,
      email: 'hallo@everware.nl',
      telephone: '+31612345678',
      identifier: { '@type': 'PropertyValue', propertyID: 'KvK', value: '89042786' },
      areaServed: { '@type': 'Country', name: 'Netherlands' },
      knowsLanguage: ['nl', 'en'],
      knowsAbout: [
        'custom software development', 'AI solutions', 'autonomous AI agents',
        'process automation', 'LLM applications', 'RAG',
        'software architecture', 'process optimization'
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: tt.svH2,
        itemListElement: tt.svCards.map((c) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: c.title, description: c.desc, provider: { '@id': SITE_URL + '/#org' } }
        }))
      }
    },
    {
      '@type': 'WebSite',
      '@id': SITE_URL + '/#website',
      url: SITE_URL + '/',
      name: 'Everware',
      publisher: { '@id': SITE_URL + '/#org' },
      inLanguage: ['nl', 'en']
    },
    {
      '@type': 'WebPage',
      '@id': url,
      url,
      name: tt.title,
      description: tt.metaDesc,
      isPartOf: { '@id': SITE_URL + '/#website' },
      about: { '@id': SITE_URL + '/#org' },
      inLanguage: lang
    },
    {
      '@type': 'FAQPage',
      '@id': url + '#faq',
      inLanguage: lang,
      mainEntity: tt.faqItems.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    }
  ];
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
    .replace(/</g, '\\u003C'); // never allow </script> breakout inside JSON strings
  return '<script type="application/ld+json">\n' + json + '\n</script>';
}

const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Keep the Dutch JSON-LD in index.html in sync with copy.nl (idempotent)
const nlBlock = jsonld('nl', copy.nl, '/');
if (!JSONLD_RE.test(html)) throw new Error('JSON-LD placeholder not found in index.html');
const htmlSynced = html.replace(JSONLD_RE, () => nlBlock);
if (htmlSynced !== html) {
  fs.writeFileSync(path.join(ROOT, 'index.html'), htmlSynced);
  console.log('index.html JSON-LD (nl) refreshed');
}
html = htmlSynced;

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

html = html.replace(JSONLD_RE, () => jsonld('en', t, '/en/'));

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
