// Packs the PHP files into src/generated/files.json (base backend + vendor, reference solutions, starters).
import fs from 'node:fs';
import { readTree } from './load-files.mjs';
const base = { ...readTree('php/ref/backend', 'backend/'), ...readTree('php/vendor', 'backend/vendor/') };
const ref = { ...base, '.gitignore': fs.readFileSync('php/ref/gitignore', 'utf8') };
const starters = readTree('php/starters', '');
fs.writeFileSync('src/generated/files.json', JSON.stringify({ base: ref, starters }));
console.log('files.json:', Object.keys(ref).length, 'files,', Object.keys(starters).length, 'starters');
