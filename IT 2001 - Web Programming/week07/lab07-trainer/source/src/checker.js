// Runs the checks of one task against the student's file (all other files = reference).
import { BACKEND } from './engine.js';

const PRELUDE = String.raw`<?php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_DEPRECATED);
date_default_timezone_set('Europe/Sarajevo');
$GLOBALS['__R'] = [];
function t($name, $fn) {
    try { $r = $fn(); }
    catch (Throwable $e) {
        $r = 'Unexpected ' . get_class($e) . ': ' . $e->getMessage() . ' (' . basename($e->getFile()) . ' line ' . $e->getLine() . ')';
    }
    if ($r === 1) $r = true;   // preg_match() found it
    $GLOBALS['__R'][] = ['name' => $name, 'ok' => $r === true, 'msg' => $r === true ? '' : (is_string($r) ? $r : 'got ' . var_export($r, true))];
}
function expect_throw($fn, $class, $message = null) {
    try { $fn(); }
    catch (Throwable $e) {
        if (!($e instanceof $class)) return 'Expected ' . $class . ', but got ' . get_class($e) . ': ' . $e->getMessage();
        if ($message !== null && $e->getMessage() !== $message) return 'Expected the message "' . $message . '", but got "' . $e->getMessage() . '"';
        return true;
    }
    return 'Expected ' . $class . ' to be thrown, but nothing was thrown.';
}
function log_text($name) { $f = '/app/backend/logs/' . $name; return is_file($f) ? file_get_contents($f) : ''; }
function clear_logs() { foreach (['info.log', 'error.log'] as $f) { @unlink('/app/backend/logs/' . $f); } }
function db() { return new PDO('sqlite:/app/data/campusevents.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]); }
register_shutdown_function(function () {
    $e = error_get_last();
    $fatal = null;
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_COMPILE_ERROR, E_CORE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR])) {
        $fatal = $e['message'] . ' (' . basename($e['file']) . ' line ' . $e['line'] . ')';
    }
    echo "\n@@R@@" . json_encode(['r' => $GLOBALS['__R'], 'fatal' => $fatal]);
});
require '/app/backend/vendor/autoload.php';
?>`;

const clean = (s) => String(s || '').replaceAll('/app/backend/', '').replaceAll('/app/', '');

export function makeContext(eng, task, src) {
  const results = [];
  const add = (name, ok, msg = '') => results.push({ name, ok: !!ok, msg: ok ? '' : clean(msg) });

  async function php(code) {
    const out = await eng.runCode(PRELUDE + code);
    const i = out.text.lastIndexOf('@@R@@');
    if (i < 0) {
      add('PHP ran the checks', false, 'PHP stopped: ' + (out.errors || out.text || 'no output').slice(0, 400));
      return;
    }
    const data = JSON.parse(out.text.slice(i + 5));
    for (const r of data.r) add(r.name, r.ok, r.msg);
    if (data.fatal) add('No fatal PHP error', false, data.fatal);
  }

  async function req(method, uri, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    return eng.request(method, uri, { ...opts, headers });
  }

  function describe(res) {
    if (res.crashed) return 'PHP crashed: ' + res.error;
    if (res.json === null) return `status ${res.status}, the answer is not JSON: ` + clean(res.text).replace(/\s+/g, ' ').slice(0, 260);
    return `status ${res.status}, body ` + JSON.stringify(res.json).slice(0, 260);
  }

  // expect(name, res, status, { error, has, test })
  function expect(name, res, status, more = {}) {
    if (res.status !== status || res.json === null) return add(name, false, `Expected ${status}; got ${describe(res)}`);
    if (more.error !== undefined && res.json?.error !== more.error) return add(name, false, `Expected {"error": "${more.error}"}; got ${describe(res)}`);
    if (more.test) {
      const m = more.test(res.json, res);
      if (m !== true) return add(name, false, (typeof m === 'string' ? m : 'Wrong answer') + ' – ' + describe(res));
    }
    add(name, true);
  }

  // A token made directly with firebase/php-jwt (independent of the student's AuthService)
  async function mint({ id = 2, email = 'ema@campusevents.ba', role = 'student', first_name = 'Ema', last_name = 'Kovač', exp = 3600, secret = null } = {}) {
    const code = String.raw`<?php require '/app/backend/vendor/autoload.php'; require_once '/app/backend/config/config.php';
      $secret = ${secret ? JSON.stringify(secret) : 'Config::JWT_SECRET()'};
      echo Firebase\JWT\JWT::encode(['user' => ['id' => ${id}, 'email' => ${JSON.stringify(email)}, 'first_name' => ${JSON.stringify(first_name)}, 'last_name' => ${JSON.stringify(last_name)}, 'role' => ${JSON.stringify(role)}],
        'iat' => time() - 10, 'exp' => time() + (${exp})], $secret, 'HS256');`;
    const out = await eng.runCode(code);
    return out.text.trim();
  }

  async function login(email = 'ema@campusevents.ba', password = 'Student123!') {
    const r = await req('POST', '/auth/login', { body: { email, password } });
    return r.json?.token || null;
  }

  async function syntax() {
    if (!task.file.endsWith('.php')) return true;
    const out = await eng.runCode(String.raw`<?php
      try { token_get_all(file_get_contents('/app/${task.file}'), TOKEN_PARSE); echo 'OK'; }
      catch (ParseError $e) { echo 'Syntax error on line ' . $e->getLine() . ': ' . $e->getMessage(); }`);
    const ok = out.text.trim() === 'OK';
    add('PHP syntax is correct', ok, out.text.trim() || out.errors);
    return ok;
  }

  return { results, add, php, req, expect, mint, login, syntax, src, eng, log: (n) => eng.readLog(n), clearLogs: () => eng.clearLogs(), writeFile: (rel, text) => eng.php.writeFile(BACKEND + '/' + rel, text) };
}

export async function runTask(eng, task, src, baseFiles) {
  await eng.install({ ...baseFiles, [task.file]: src });
  const c = makeContext(eng, task, src);
  try {
    const ok = await c.syntax();
    if (ok) await task.check(c);
  } catch (e) {
    c.add('The checker finished', false, String(e?.message || e));
  }
  return c.results;
}
