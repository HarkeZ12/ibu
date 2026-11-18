// node scripts/selftest.mjs [ref|starter|both] [taskId]
import fs from 'node:fs';
import { loadNodeRuntime } from '@php-wasm/node';
import { PHP, setPhpIniEntries } from '@php-wasm/universal';
import { createEngine } from '../src/engine.js';
import { runTask } from '../src/checker.js';
import { TASKS } from '../src/tasks.js';
import { readTree } from './load-files.mjs';

const mode = process.argv[2] || 'both';
const only = process.argv[3];
const php = new PHP(await loadNodeRuntime('8.4', { emscriptenOptions: { processId: 1 } }));
await setPhpIniEntries(php, { display_errors: '1', html_errors: '0', error_reporting: String(32767 & ~8192), 'date.timezone': 'Europe/Sarajevo' });
const eng = createEngine(php);
const base = { ...readTree('php/ref/backend', 'backend/'), ...readTree('php/vendor', 'backend/vendor/'), '.gitignore': fs.readFileSync('php/ref/gitignore', 'utf8') };
const refOf = (t) => (t.file === '.gitignore' ? fs.readFileSync('php/ref/gitignore', 'utf8') : base[t.file]);
let bad = 0;
for (const t of TASKS) {
  if (only && t.id !== only) continue;
  for (const kind of mode === 'both' ? ['ref', 'starter'] : [mode]) {
    const src = kind === 'ref' ? refOf(t) : fs.readFileSync('php/starters/' + t.starter, 'utf8');
    const t0 = Date.now();
    const res = await runTask(eng, t, src, base);
    const pass = res.filter((r) => r.ok).length;
    const ok = kind === 'ref' ? pass === res.length : pass < res.length;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'BAD'} ${kind.padEnd(7)} ${t.id.padEnd(18)} ${pass}/${res.length}  ${Date.now() - t0}ms`);
    if (kind === 'ref' || process.env.V) for (const r of res) if (!r.ok) console.log('     ✗ ' + r.name + '\n       ' + r.msg.replace(/\n/g, '\n       '));
    if (kind === 'starter' && process.env.V) for (const r of res) if (r.ok) console.log('     ✓ ' + r.name);
  }
}
console.log(bad ? `${bad} problem(s)` : 'all good');
process.exit(bad ? 1 : 0);
