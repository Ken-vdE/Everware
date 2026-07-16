#!/usr/bin/env node
// ONE-OFF migration: extract the `copy` object from public/assets/main.js
// into content/copy.json. Delete this script after the migration.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'public/assets/main.js'), 'utf8');

// Same slicing technique scripts/build-en.js already uses.
const start = js.indexOf('const copy = {');
const end = js.indexOf('};', js.indexOf('ftCopyRight', js.indexOf('en: {')));
if (start === -1 || end === -1) throw new Error('copy object not found in main.js');
const copy = eval('(' + js.slice(start + 'const copy = '.length, end + 1) + ')');

// build-en.js translated this via a hardcoded .replace(); it becomes a real key now.
copy.nl.navAria = 'Hoofdnavigatie';
copy.en.navAria = 'Main navigation';

fs.mkdirSync(path.join(ROOT, 'content'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'content/copy.json'),
  JSON.stringify(copy, null, 2) + '\n'
);
console.log('content/copy.json written');
