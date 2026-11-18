import fs from 'node:fs';
import { loadNodeRuntime } from '@php-wasm/node';
import { PHP, setPhpIniEntries } from '@php-wasm/universal';
import { createEngine } from '../src/engine.js';
import { runTask } from '../src/checker.js';
import { TASKS } from '../src/tasks.js';
const F = JSON.parse(fs.readFileSync('src/generated/files.json', 'utf8'));
const php = new PHP(await loadNodeRuntime('8.4', { emscriptenOptions: { processId: 1 } }));
await setPhpIniEntries(php, { display_errors: '1', html_errors: '0', error_reporting: String(32767 & ~8192) });
const eng = createEngine(php);
const M = [
  ['auth-middleware', 'catch Exception first', (s) => s.replace(/\} catch \(ExpiredException \$e\) \{[\s\S]*?\} catch \(Exception \$e\) \{([\s\S]*?)\}/, '} catch (Exception $e) {$1}')],
  ['auth-middleware', 'user as object', (s) => s.replace("(array) $decoded->user", '$decoded->user')],
  ['auth-middleware', 'no REDIRECT fallback', (s) => s.replace(/if \(!\$header\) \{[\s\S]*?\}\n/, '')],
  ['auth-service', 'role from client', (s) => s.replace("$data['role'] = Roles::STUDENT;", '')],
  ['auth-service', 'different messages', (s) => s.replace("if (!$user || !password_verify($data['password'], $user['password'])) {", "if (!$user) throw new UnauthorizedException('Unknown email.');\n        if (!password_verify($data['password'], $user['password'])) {")],
  ['auth-service', 'hash kept', (s) => s.replace("unset($user['password']);", '')],
  ['auth-routes', 'me without middleware', (s) => s.replace("Flight::json(Flight::auth_service()->get_profile(Flight::get('user')['id']));\n})->addMiddleware(new AuthMiddleware());", "Flight::json(Flight::auth_service()->get_profile(Flight::get('user')['id']));\n});")],
  ['index', 'auth routes inside group', (s) => s.replace("require_once __DIR__ . '/rest/routes/AuthRoutes.php';\n", '').replace("Flight::group('', function () {\n", "Flight::group('', function () {\n    require_once __DIR__ . '/rest/routes/AuthRoutes.php';\n")],
  ['error-middleware', 'leaks message', (s) => s.replace("$message = 'Something went wrong on the server. Please try again later.';", '$message = $e->getMessage();')],
  ['request-log', 'logs at start', (s) => s.replace(/register_shutdown_function\(function \(\) use \(\$start\) \{([\s\S]*)\}\);/, '(function () use ($start) {$1})();')],
  ['config', 'syntax error', (s) => s.replace('return self::get_env(\'JWT_SECRET\'', 'return self::get_env(\'JWT_SECRET\' ')],
];
for (const [id, name, fn] of M) {
  const t = TASKS.find((x) => x.id === id);
  const src = fn(F.base[t.file]);
  if (src === F.base[t.file]) { console.log('NO CHANGE', id, name); continue; }
  const res = await runTask(eng, t, src, F.base);
  const fails = res.filter((r) => !r.ok);
  console.log(`${fails.length ? 'caught' : 'MISSED'} ${id} / ${name}: ${fails.length} fail → ${fails.slice(0, 3).map((f) => f.name).join(' | ')}`);
}
process.exit(0);
