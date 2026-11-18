// The create_token() of the Lab 07 document (user = id, email, role) must pass too.
import fs from 'node:fs';
import { loadNodeRuntime } from '@php-wasm/node';
import { PHP, setPhpIniEntries } from '@php-wasm/universal';
import { createEngine } from '../src/engine.js';
import { runTask } from '../src/checker.js';
import { TASKS } from '../src/tasks.js';
const F = JSON.parse(fs.readFileSync('src/generated/files.json', 'utf8'));
const php = new PHP(await loadNodeRuntime('8.4', { emscriptenOptions: { processId: 1 } }));
await setPhpIniEntries(php, { display_errors: '1', html_errors: '0', error_reporting: String(32767 & ~8192) });
const t = TASKS.find((x) => x.id === 'auth-service');
const src = F.base[t.file].replace(/'user' => \[[\s\S]*?\],\n(\s*)'iat'/, "'user' => ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']],\n$1'iat'");
if (src === F.base[t.file]) throw new Error('no change');
const res = await runTask(createEngine(php), t, src, F.base);
const bad = res.filter((r) => !r.ok);
console.log(bad.length ? 'FAIL ' + JSON.stringify(bad) : `lab-document create_token passes ${res.length}/${res.length}`);
process.exit(bad.length ? 1 : 0);
