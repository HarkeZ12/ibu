// PHP engine shared by the browser app and the Node self-test.
// files: { 'backend/index.php': '...', 'backend/vendor/...': '...' } (paths relative to /app)

export const ROOT = '/app';
export const BACKEND = '/app/backend';

export function createEngine(php) {
  let busy = Promise.resolve();
  const lock = (fn) => { const p = busy.then(fn, fn); busy = p.catch(() => {}); return p; };

  function mkdirp(path) {
    const parts = path.split('/').filter(Boolean);
    let cur = '';
    for (const p of parts) { cur += '/' + p; if (!php.fileExists(cur)) php.mkdir(cur); }
  }
  function rmrf(path) {
    if (!php.fileExists(path)) return;
    if (php.isDir(path)) php.rmdir(path, { recursive: true }); else php.unlink(path);
  }

  async function install(files) {
    rmrf(BACKEND);
    rmrf(ROOT + '/data');
    for (const [rel, text] of Object.entries(files)) {
      const full = ROOT + '/' + rel;
      mkdirp(full.slice(0, full.lastIndexOf('/')));
      php.writeFile(full, text);
    }
    mkdirp(BACKEND + '/logs');
    mkdirp(ROOT + '/data');
  }

  function clearLogs() {
    for (const f of ['info.log', 'error.log']) rmrf(BACKEND + '/logs/' + f);
    mkdirp(BACKEND + '/logs');
  }

  function readLog(name) {
    const f = BACKEND + '/logs/' + name;
    return php.fileExists(f) ? php.readFileAsText(f) : '';
  }

  async function request(method, uri, { headers = {}, body = undefined, server = {}, script = 'index.php' } = {}) {
    return lock(async () => {
      const h = { host: 'localhost', ...headers };
      let payload;
      if (body !== undefined) {
        payload = new TextEncoder().encode(typeof body === 'string' ? body : JSON.stringify(body));
        if (!Object.keys(h).some((k) => k.toLowerCase() === 'content-type')) h['content-type'] = 'application/json';
      }
      let res;
      try {
        res = await php.run({
          scriptPath: BACKEND + '/' + script,
          relativeUri: uri,
          method,
          headers: h,
          body: payload,
          $_SERVER: { SCRIPT_NAME: '/' + script, SCRIPT_FILENAME: BACKEND + '/' + script, DOCUMENT_ROOT: BACKEND, PHP_SELF: '/' + script, ...server },
        });
      } catch (e) {
        return { status: 0, text: '', json: null, crashed: true, error: String(e?.message || e), headers: {} };
      }
      let json = null;
      try { json = JSON.parse(res.text); } catch {}
      return { status: res.httpStatusCode, text: res.text, json, errors: res.errors, headers: res.headers, exitCode: res.exitCode };
    });
  }

  async function runCode(code) {
    return lock(async () => {
      php.writeFile(ROOT + '/check.php', code);
      try {
        const res = await php.run({ scriptPath: ROOT + '/check.php' });
        return { text: res.text, errors: res.errors, exitCode: res.exitCode };
      } catch (e) {
        return { text: '', errors: String(e?.message || e), exitCode: 255, crashed: true };
      }
    });
  }

  return { install, request, runCode, readLog, clearLogs, php, rmrf, mkdirp };
}
