// Lab 07 trainer – same look and layout as the DSA Assignment 2 prep page (its CSS is src/a2.css).
import './a2.css';
import './lab07.css';
import { loadWebRuntime } from '@php-wasm/web';
import { PHP, setPhpIniEntries } from '@php-wasm/universal';
import FILES from './generated/files.json';
import { createEngine } from './engine.js';
import { runTask } from './checker.js';
import { TASKS } from './tasks.js';

/* ====================================================================== storage */
const KEY = 'ibu-it2001-lab07-trainer-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { saved = {}; }
saved.code = saved.code || {};
saved.client = saved.client || { sent: 0, token: '' };
let persistTimer = null;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} }, 150);
}
window.addEventListener('pagehide', () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} });

/* ====================================================================== theme + battery saver */
const root = document.documentElement;
try { const t = localStorage.getItem(KEY + '-theme'); if (t) root.dataset.theme = t; } catch {}
document.getElementById('themeBtn').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem(KEY + '-theme', root.dataset.theme); } catch {}
  if (window.monaco && window.monaco.editor) window.monaco.editor.setTheme(monacoTheme());
});
const saverBtn = document.getElementById('battery-saver');
function paintSaver(on) { root.dataset.batterySaver = on ? 'true' : 'false'; saverBtn.setAttribute('aria-pressed', on); saverBtn.textContent = 'Battery saver: ' + (on ? 'on' : 'off'); }
try { paintSaver(localStorage.getItem(KEY + '-saver') === '1'); } catch { paintSaver(false); }
saverBtn.addEventListener('click', () => {
  const on = root.dataset.batterySaver !== 'true'; paintSaver(on);
  try { localStorage.setItem(KEY + '-saver', on ? '1' : '0'); } catch {}
});

const examBtn = document.getElementById('examBtn');
function paintExam(on) { root.dataset.exam = on ? 'true' : 'false'; examBtn.setAttribute('aria-pressed', on); examBtn.textContent = 'Exam: ' + (on ? 'on' : 'off'); }
try { paintExam(localStorage.getItem(KEY + '-exam') === '1'); } catch { paintExam(false); }
examBtn.addEventListener('click', () => {
  const on = root.dataset.exam !== 'true'; paintExam(on);
  document.querySelectorAll('.que details.hints, .que details.sol').forEach((d) => (d.open = false));
  try { localStorage.setItem(KEY + '-exam', on ? '1' : '0'); } catch {}
});

/* ====================================================================== helpers */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const newSeed = () => (Math.random() * 4294967295) >>> 0 || 7;
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const ICON = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};
function verdictHtml(ok, text) {
  return `<div class="verdict ${ok ? 'ok' : 'no'}">${ok ? ICON.ok : ICON.no}<span>${esc(text)}</span></div>`;
}
function setStateBadge(el, status) {
  el.className = 'state' + (status ? ' ' + status : '');
  el.textContent = status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : status === 'answered' ? 'Answer saved' : 'Not complete';
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 1800);
}

/* ====================================================================== PHP */
let engine = null, enginePromise = null, clientDirty = true;
function phpUi(state, text) {
  const box = $('#phpBox');
  box.classList.remove('loading', 'ready', 'failed');
  box.classList.add(state);
  $('#phpState').textContent = text;
}
function bootPhp() {
  if (enginePromise) return enginePromise;
  phpUi('loading', 'Loading PHP…');
  enginePromise = (async () => {
    const php = new PHP(await loadWebRuntime('8.4'));
    await setPhpIniEntries(php, { display_errors: '1', html_errors: '0', error_reporting: String(32767 & ~8192), 'date.timezone': 'Europe/Sarajevo' });
    engine = createEngine(php);
    phpUi('ready', 'Ready – FlightPHP 3.19, php-jwt 7');
    return engine;
  })().catch((e) => {
    phpUi('failed', 'PHP did not load – reload the page');
    enginePromise = null;
    throw e;
  });
  return enginePromise;
}

/* ====================================================================== tabs */
const tabs = [...document.querySelectorAll('.tab')];
const mounted = {};
function showTab(name) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById('panel-' + t.dataset.tab).hidden = !on;
  });
  saved.tab = name; persist();
  if (!mounted[name]) { mounted[name] = true; name === 'code' ? mountCodeTab() : mountClientTab(); }
  else if (name === 'client') renderClient();
}
tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
tabs.forEach((t, i) => t.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  n.focus(); showTab(n.dataset.tab);
}));

/* ====================================================================== coding */
const starterOf = (t) => FILES.starters[t.starter];
const solutionOf = (t) => FILES.base[t.file];
const isText = (t) => t.lang === 'text';
const GAP = 'TODO: missing line';
const gapOf = (t) => (isText(t) ? '# ' + GAP : '// ' + GAP);
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
function todoText(t) {
  const c = isText(t) ? ['#', '#', ''] : ['/*', ' *', ' */'];
  return [c[0] + ' TODO ' + t.title, ...t.spec.map((x) => c[1] + ' TODO ' + plain(x)), c[2]].filter(Boolean).join('\n');
}
function codeStatus(id) { const s = saved.code[id]; return s && s.status; }
function updateCodeCounts() {
  const solved = TASKS.filter((t) => codeStatus(t.id) === 'correct').length;
  $('#count-code').textContent = `${solved}/${TASKS.length}`;
  const sc = $('#codeScore'); if (sc) sc.textContent = `${solved} / ${TASKS.length}`;
}

// Lines that the student has to write = solution lines that are not in the starter file.
function gapCandidates(task) {
  const starter = new Set(starterOf(task).split('\n').map((l) => l.trim()));
  const lines = solutionOf(task).replace(/\n+$/, '').split('\n');
  const out = [];
  lines.forEach((l, i) => {
    const t = l.trim();
    if (!t || starter.has(t) || /^[{}()\[\],;]+$/.test(t) || /^(\/\/|#(?!\[)|\/?\*)/.test(t) || t === '} else {') return;
    out.push(i);
  });
  return { lines, out };
}
function makeGaps(task, seed) {
  const { lines, out } = gapCandidates(task);
  const r = rng(seed);
  const want = Math.min(out.length, r() < 0.4 ? 1 : r() < 0.6 ? 2 : 3);
  const chosen = new Set();
  while (chosen.size < want) chosen.add(out[Math.floor(r() * out.length)]);
  const text = lines.map((l, i) => (chosen.has(i) ? l.match(/^\s*/)[0] + gapOf(task) : l)).join('\n') + '\n';
  return { text, gaps: [...chosen].sort((a, b) => a - b) };
}

function mountCodeTab() {
  const list = $('#codeList');
  let html = '', last = null;
  TASKS.forEach((t, i) => {
    if (t.step !== last) { html += `<h3>${esc(t.step)}</h3>`; last = t.step; }
    html += `<button class="titem" type="button" data-id="${t.id}"><span class="dot" aria-hidden="true"></span><span class="t">${esc(t.name)}</span><span class="tag">${i + 1}</span></button>`;
  });
  list.innerHTML = html;
  list.addEventListener('click', (e) => { const b = e.target.closest('.titem'); if (b) openTask(b.dataset.id, true); });
  const first = TASKS.find((t) => t.id === saved.codeSel) || TASKS[0];
  openTask(first.id, false);
}
function paintCodeList() {
  document.querySelectorAll('#codeList .titem').forEach((b) => {
    const s = saved.code[b.dataset.id];
    b.classList.remove('correct', 'incorrect', 'answered');
    if (s && s.status) b.classList.add(s.status);
    else if (s && s.touched) b.classList.add('answered');
    b.setAttribute('aria-current', b.dataset.id === saved.codeSel);
  });
  updateCodeCounts();
}

/* ---------- Monaco (the VS Code editor) with PHP suggestions ---------- */
const MONACO = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';
let monacoPromise = null;
function monacoTheme() {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  return dark ? 'a2-dark' : 'a2-light';
}
function loadMonaco() {
  if (window.monaco && window.monaco.editor) return Promise.resolve(window.monaco);
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    window.MonacoEnvironment = {
      getWorkerUrl: () => URL.createObjectURL(new Blob([`self.MonacoEnvironment={baseUrl:"${MONACO}/../"};importScripts("${MONACO}/base/worker/workerMain.js");`], { type: 'text/javascript' })),
    };
    const s = document.createElement('script');
    s.src = MONACO + '/loader.js';
    s.onerror = () => reject(new Error('editor did not load'));
    s.onload = () => {
      window.require.config({ paths: { vs: MONACO } });
      window.require(['vs/editor/editor.main'], () => { setupMonaco(window.monaco); resolve(window.monaco); }, reject);
    };
    document.head.appendChild(s);
  });
  monacoPromise.catch(() => { monacoPromise = null; });
  return monacoPromise;
}
const PHP_KEYWORDS = ('public private protected static function return if else elseif foreach as throw new null true false isset empty unset ' +
  'class extends const instanceof try catch finally use require require_once fn echo array self parent').split(' ');
const API = [
  ['Flight::route', "Flight::route('${1:GET} ${2:/path}', function (${3}) {\n\t$0\n});", 'a route'],
  ['Flight::group', "Flight::group('', function () {\n\t$0\n}, [new AuthMiddleware()]);", 'a protected group of routes'],
  ['Flight::json', "Flight::json(${1:\\$data}${2:, 201});", 'send JSON'],
  ['Flight::request()->data->getData()', "Flight::request()->data->getData()", 'JSON body of the request'],
  ["Flight::request()->getHeader('Authorization')", "Flight::request()->getHeader('Authorization')", 'Authorization header'],
  ["Flight::set('user', …)", "Flight::set('user', (array) \\$decoded->user);", 'store the user'],
  ["Flight::get('user')['id']", "Flight::get('user')['id']", 'id of the logged-in user'],
  ['Flight::has', "Flight::has('user')", 'is the user set?'],
  ['Flight::register', "Flight::register('${1:auth_service}', '${2:AuthService}');", 'register a service'],
  ["Flight::before('start', …)", "Flight::before('start', function () use (\\$${1:request_logger}) {\n\t\\$${1:request_logger}->before();\n});", 'global middleware'],
  ["Flight::map('error', …)", "Flight::map('error', [\\$${1:error_handler}, 'handle']);", 'error handler'],
  ["Flight::map('notFound', …)", "Flight::map('notFound', [\\$${1:error_handler}, 'not_found']);", '404 handler'],
  ['->addMiddleware(new AuthMiddleware())', '->addMiddleware(new AuthMiddleware());', 'middleware for one route'],
  ['JWT::encode', "JWT::encode(\\$payload, Config::JWT_SECRET(), 'HS256')", 'create a token'],
  ['JWT::decode', "JWT::decode(\\$token, new Key(Config::JWT_SECRET(), 'HS256'))", 'check a token'],
  ['Config::JWT_SECRET()', 'Config::JWT_SECRET()', 'the secret'],
  ['Config::JWT_EXPIRATION()', 'Config::JWT_EXPIRATION()', 'seconds'],
  ['password_verify', "password_verify(\\$data['password'], \\$user['password'])", 'check a password'],
  ['password_hash', 'password_hash(\\$password, PASSWORD_BCRYPT)', 'hash a password'],
  ['Logger::info', 'Logger::info("${1}");', 'info.log'],
  ['Logger::error', 'Logger::error("${1}");', 'error.log'],
  ['Validator::required', "Validator::required(\\$data, ['${1:email}', '${2:password}']);", '400 when missing'],
  ['throw new UnauthorizedException', "throw new UnauthorizedException('${1:Missing authentication token.}');", '401'],
  ['throw new ValidationException', "throw new ValidationException('${1}');", '400'],
  ['register_shutdown_function', 'register_shutdown_function(function () use (\\$start) {\n\t$0\n});', 'runs at the end'],
  ['trycatch', "try {\n\t${1}\n} catch (ExpiredException \\$e) {\n\t${2}\n} catch (Exception \\$e) {\n\t$0\n}", 'try / catch for JWT::decode'],
  ['preg_match Bearer', "preg_match('/^Bearer\\\\s+(\\\\S+)\\$/i', \\$header, \\$matches)", 'read the token'],
  ['microtime(true)', 'microtime(true)', 'time in seconds'],
  ['http_response_code()', 'http_response_code()', 'final status'],
  ['parse_url(… PHP_URL_PATH)', 'parse_url(\\$request->url, PHP_URL_PATH)', 'path without the query'],
  ['Roles::STUDENT', 'Roles::STUDENT', "'student'"],
  ['time()', 'time()', 'now'],
];
function setupMonaco(m) {
  m.editor.defineTheme('a2-light', { base: 'vs', inherit: true, rules: [], colors: {
    'editor.background': '#fbfbff', 'editor.lineHighlightBackground': '#eef0ff', 'editorLineNumber.foreground': '#9aa0c0',
    'editorLineNumber.activeForeground': '#5a46f0', 'editorCursor.foreground': '#5a46f0' } });
  m.editor.defineTheme('a2-dark', { base: 'vs-dark', inherit: true, rules: [], colors: {
    'editor.background': '#0b0f22', 'editor.lineHighlightBackground': '#141a38', 'editorLineNumber.foreground': '#4f5878',
    'editorLineNumber.activeForeground': '#a191ff', 'editorCursor.foreground': '#a191ff' } });
  m.editor.setTheme(monacoTheme());
  const K = m.languages.CompletionItemKind, R = m.languages.CompletionItemInsertTextRule;
  m.languages.registerCompletionItemProvider('php', {
    triggerCharacters: [':', '>', '$'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const out = [], seen = new Set();
      const add = (label, kind, insertText, detail, snippet, sort) => {
        if (seen.has(label)) return; seen.add(label);
        out.push({ label, kind, insertText: insertText || label, detail, range, sortText: sort || '5' + label, insertTextRules: snippet ? R.InsertAsSnippet : undefined, filterText: label.replace(/[^\w]/g, '') + ' ' + label });
      };
      API.forEach(([label, body, detail]) => add(label, K.Snippet, body, detail, true, '2' + label));
      PHP_KEYWORDS.forEach((w) => add(w, K.Keyword, null, 'keyword', false, '4' + w));
      const mine = new Set(model.getValue().match(/\$?\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) || []);
      mine.delete(word.word);
      mine.forEach((w) => add(w.replace(/^\$/, ''), K.Variable, null, 'in your code', false, '3' + w));
      return { suggestions: out };
    },
  });
}

let activeEditor = null, viewToken = 0;
function openTask(id, scroll) {
  const myView = ++viewToken;
  if (activeEditor && activeEditor.dispose) { activeEditor.dispose(); activeEditor = null; }
  const idx = TASKS.findIndex((t) => t.id === id);
  const task = TASKS[idx];
  saved.codeSel = id; persist();
  const st = saved.code[id] = saved.code[id] || {};
  st.mode = st.mode || 'file';
  st.text = st.text || {};
  if (!st.seed) st.seed = newSeed();

  const main = $('#codeMain');
  main.innerHTML = `
  <section class="que" aria-labelledby="codeTitle">
    <div class="info">
      <h3 id="codeTitle">Task <b>${idx + 1}</b> of ${TASKS.length}: ${esc(task.name)}</h3>
      <div class="state">Not complete</div>
      <div class="grade">${esc(task.step)} · <code>${esc(task.file.replace('backend/', ''))}</code></div>
    </div>
    <div class="content">
      <div class="formulation">
        <pre class="todo"><code>${esc(todoText(task))}</code></pre>
        <p class="modehint"></p>
        <div class="prompt"><span>Answer:</span><span class="regime">the whole file <code>${esc(task.file.split('/').pop())}</code></span></div>
      </div>
      <details class="given hints"><summary>Hints: the steps of the lab</summary><ol class="steps">${task.steps.map((s) => `<li>${s}</li>`).join('')}</ol><p class="note why-note"><b>Why?</b> ${task.why}</p></details>
      <div class="modes" role="group" aria-label="Mode"><span class="label">Mode:</span>
        <button class="mode" type="button" data-mode="lines">Missing lines</button>
        <button class="mode" type="button" data-mode="file">Whole file</button></div>
      <div class="answer"><div class="editor"><textarea spellcheck="false" aria-label="Your answer"></textarea></div></div>
      <p class="exam-note">Exam mode is on: hints and the solution are hidden. Write the code from the TODO comments, then press Check.</p>
      <p class="editor-hint">Suggestions pop up while you type: <span class="kbd">↑</span> <span class="kbd">↓</span> to choose, <span class="kbd">Tab</span> or <span class="kbd">Enter</span> to insert, <span class="kbd">Ctrl</span>+<span class="kbd">Space</span> to open them. Type <code>Flight</code>, <code>JWT</code>, <code>Logger</code> or <code>trycatch</code> for ready-made code. <span class="kbd">Ctrl</span>+<span class="kbd">Enter</span> checks.</p>
      <div class="actions">
        <button class="btn primary check" type="button">Check</button>
        <button class="btn ghost reset" type="button">Reset answer</button>
        <button class="btn ghost newgaps" type="button" hidden>New gaps</button>
      </div>
      <div class="outcome" hidden></div>
      <details class="sol"><summary>Show solution</summary><div class="solbody"></div></details>
    </div>
  </section>
  <div class="pager">
    <button class="btn ghost prev" type="button" ${idx === 0 ? 'disabled' : ''}>← Previous task</button>
    <button class="btn ghost next" type="button" ${idx === TASKS.length - 1 ? 'disabled' : ''}>Next task →</button>
  </div>`;
  const sec = $('.que', main), out = $('.outcome', sec), stateEl = $('.state', sec);
  setStateBadge(stateEl, st.status || (st.touched ? 'answered' : ''));
  $('.prev', main).addEventListener('click', () => openTask(TASKS[idx - 1].id, true));
  $('.next', main).addEventListener('click', () => openTask(TASKS[idx + 1].id, true));
  paintCodeList();

  const starterFor = (mode) => (mode === 'lines' ? makeGaps(task, st.seed).text : starterOf(task));
  let revision = 0;
  const ta = $('textarea', sec);
  const edBox = $('.editor', sec);
  let ed = null, decos = null, quiet = false;
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); }
  });
  ta.addEventListener('input', () => onChange());
  const getVal = () => (ed ? ed.getValue() : ta.value);
  function setVal(v) {
    quiet = true;
    if (ed) ed.setValue(v); else ta.value = v;
    quiet = false;
    markGaps();
  }
  function markGaps() {
    if (!ed || !window.monaco) return;
    const model = ed.getModel(), ranges = [];
    for (let i = 1; i <= model.getLineCount(); i++) {
      if (model.getLineContent(i).includes(GAP)) ranges.push({ range: new monaco.Range(i, 1, i, 1), options: { isWholeLine: true, className: 'monaco-gap' } });
    }
    if (decos) decos.set(ranges); else decos = ed.createDecorationsCollection(ranges);
  }
  loadMonaco().then((m) => {
    if (myView !== viewToken) return;
    const value = ta.value;
    edBox.innerHTML = '<div class="monaco-host"></div>';
    const host = $('.monaco-host', edBox);
    let overflow = document.getElementById('monaco-overflow');
    if (!overflow) {
      overflow = document.createElement('div');
      overflow.id = 'monaco-overflow'; overflow.className = 'monaco-editor';
      overflow.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:60';
      document.body.appendChild(overflow);
    }
    ed = m.editor.create(host, {
      value, language: isText(task) ? 'ini' : 'php', theme: monacoTheme(), automaticLayout: true,
      fontFamily: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace", fontSize: 14, lineHeight: 21,
      tabSize: 4, insertSpaces: true, detectIndentation: false, minimap: { enabled: false },
      scrollBeyondLastLine: false, scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 10 },
      padding: { top: 10, bottom: 10 }, renderLineHighlight: 'line', roundedSelection: true,
      quickSuggestions: { other: true, comments: false, strings: false }, suggestOnTriggerCharacters: true,
      wordBasedSuggestions: 'off', snippetSuggestions: 'top', tabCompletion: 'on', acceptSuggestionOnEnter: 'on',
      suggest: { showWords: true, preview: true }, autoClosingBrackets: 'always', autoClosingQuotes: 'always',
      autoIndent: 'full', bracketPairColorization: { enabled: true }, fixedOverflowWidgets: true, overflowWidgetsDomNode: overflow,
      wordWrap: 'on', ariaLabel: 'Your answer (PHP editor)',
    });
    activeEditor = ed;
    ed.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => check());
    const fit = () => { host.style.height = Math.max(260, Math.min(ed.getContentHeight(), 720)) + 'px'; ed.layout(); };
    ed.onDidContentSizeChange(fit); fit();
    ed.onDidChangeModelContent(() => { if (!quiet) onChange(); });
    markGaps();
  }).catch(() => { /* keep the plain textarea */ });

  function onChange() {
    revision++;
    st.text[st.mode] = getVal(); st.touched = true;
    st.status = null; out.hidden = true;
    setStateBadge(stateEl, 'answered');
    persist(); paintCodeList(); markGaps();
  }
  function applyMode() {
    revision++;
    const mode = st.mode;
    sec.querySelectorAll('.mode').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === mode));
    $('.newgaps', sec).hidden = mode !== 'lines';
    $('.modehint', sec).innerHTML = mode === 'lines'
      ? `Some lines were removed and replaced with <code>${esc(gapOf(task))}</code>. Write the missing code in their place (delete the TODO comment).`
      : 'This is the starter file from the skeleton. Write the code for every <code>// TODO</code> comment.';
    const v = typeof st.text[mode] === 'string' ? st.text[mode] : starterFor(mode);
    setVal(v);
    renderSolution();
  }
  sec.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => {
    if (st.mode === b.dataset.mode) return;
    st.mode = b.dataset.mode; st.status = null; out.hidden = true; persist(); applyMode();
    setStateBadge(stateEl, st.text[st.mode] ? 'answered' : ''); paintCodeList();
  }));
  $('.newgaps', sec).addEventListener('click', () => {
    st.seed = newSeed(); delete st.text.lines; st.status = null; out.hidden = true; persist(); applyMode();
    setStateBadge(stateEl, ''); paintCodeList();
  });
  $('.reset', sec).addEventListener('click', () => {
    delete st.text[st.mode]; st.status = null; st.touched = false; out.hidden = true; persist(); applyMode();
    setStateBadge(stateEl, ''); paintCodeList();
  });
  function renderSolution() {
    const gaps = st.mode === 'lines' ? new Set(makeGaps(task, st.seed).gaps) : new Set(gapCandidates(task).out);
    const lines = solutionOf(task).replace(/\n+$/, '').split('\n');
    const code = lines.map((l, i) => (gaps.has(i) ? `<span class="gapline">${esc(l)}</span>` : esc(l))).join('\n');
    $('.solbody', sec).innerHTML = `<pre><code>${code}</code></pre>` +
      (st.mode === 'lines' ? '<p>The highlighted lines are the ones that were removed.</p>' : '<p>The highlighted lines are the ones you write; the rest is in the starter file.</p>') +
      '<p>This is the code of the lecture project (week-07 CampusEvents), adapted only where the trainer uses SQLite.</p>';
  }

  const btn = $('.check', sec);
  async function check() {
    if (btn.disabled) return;
    const user = getVal();
    if (user.includes(GAP)) {
      out.hidden = false;
      out.innerHTML = verdictHtml(false, 'Some missing lines are still empty') + `<div>Replace every <code>${esc(gapOf(task))}</code> line with code first.</div>`;
      return;
    }
    const checkedRevision = revision;
    btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Checking…';
    out.hidden = false;
    out.innerHTML = `<div class="marks">${engine ? 'Starting the API and sending requests…' : 'Loading PHP (the first time takes a few seconds), then sending requests…'}</div>`;
    const t0 = performance.now();
    try {
      const eng = await bootPhp();
      clientDirty = true;
      const res = await runTask(eng, task, user, FILES.base);
      if (checkedRevision !== revision || myView !== viewToken) return;
      const pass = res.filter((r) => r.ok).length, all = pass === res.length;
      const syn = res.find((r) => r.name === 'PHP syntax is correct' && !r.ok);
      if (syn) {
        out.innerHTML = verdictHtml(false, 'PHP syntax error') + `<pre>${esc(syn.msg)}</pre><div class="marks">Usually a <code>;</code> at the end of a line, or a closing <code>}</code> or <code>)</code> is missing.</div>`;
        st.status = 'incorrect';
        const line = +(syn.msg.match(/line (\d+)/) || [])[1];
        if (line && ed) { ed.revealLineInCenter(line); ed.setSelection(new monaco.Range(line, 1, line, ed.getModel().getLineMaxColumn(line))); }
      } else {
        const rows = res.map((r) => `<tr class="${r.ok ? 'pass' : 'fail'}"><td class="mark">${r.ok ? '✓' : '✗'}</td><td>${esc(r.name)}</td><td>${r.msg ? `<pre>${esc(r.msg)}</pre>` : ''}</td></tr>`).join('');
        out.innerHTML = verdictHtml(all, all ? 'Passed all checks!' : `Passed ${pass} of ${res.length} checks`) +
          `<div class="results"><table><thead><tr><th></th><th>Check</th><th>What went wrong</th></tr></thead><tbody>${rows}</tbody></table></div>` +
          `<div class="marks">Your ${esc(task.file.split('/').pop())} ran inside the CampusEvents backend in ${((performance.now() - t0) / 1000).toFixed(1)} s; all other files are the original solution.</div>`;
        st.status = all ? 'correct' : 'incorrect';
        if (all) st.solved = user;
      }
      persist(); setStateBadge(stateEl, st.status); paintCodeList();
    } catch (err) {
      out.innerHTML = verdictHtml(false, 'Could not run PHP') + `<div class="marks">${esc(err.message || err)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = 'Check';
    }
  }
  btn.addEventListener('click', check);
  applyMode();
  if (scroll) sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

/* ====================================================================== API client */
const client = { method: 'POST', path: '/auth/login', body: JSON.stringify({ email: 'ema@campusevents.ba', password: 'Student123!' }, null, 2), logTab: 'info.log', last: null };
const QUICK = [
  ['Log in as Ema', 'POST', '/auth/login', { email: 'ema@campusevents.ba', password: 'Student123!' }],
  ['Log in as admin', 'POST', '/auth/login', { email: 'admin@campusevents.ba', password: 'Admin123!' }],
  ['Wrong password', 'POST', '/auth/login', { email: 'ema@campusevents.ba', password: 'wrong' }],
  ['Register with "role": "admin"', 'POST', '/auth/register', { first_name: 'Amar', last_name: 'Hodžić', email: 'amar@campusevents.ba', password: 'Secret123', password_confirm: 'Secret123', role: 'admin' }],
  ['GET /events', 'GET', '/events', null],
  ['GET /auth/me', 'GET', '/auth/me', null],
  ['PUT /auth/me', 'PUT', '/auth/me', { first_name: 'Emina' }],
  ['DELETE /clubs/1', 'DELETE', '/clubs/1', null],
  ['GET /nope (404)', 'GET', '/nope', null],
];
function clientFiles() {
  const files = { ...FILES.base }, mine = [];
  for (const t of TASKS) { const s = saved.code[t.id]; if (s && s.status === 'correct' && s.solved) { files[t.file] = s.solved; mine.push(t); } }
  return { files, mine };
}
async function ensureClient() {
  const eng = await bootPhp();
  if (clientDirty) { await eng.install(clientFiles().files); clientDirty = false; }
  return eng;
}
function b64(part) {
  const b = atob(part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
}
function jwtHtml(token) {
  if (!token) return '<p class="small">No token yet – log in first. The token from the answer is copied into the Authorization field automatically.</p>';
  const parts = token.split('.');
  if (parts.length !== 3) return verdictHtml(false, 'This is not a JWT – it needs three parts separated by dots.');
  let head = '(cannot decode)', body = '(cannot decode)', p = null;
  try { head = JSON.stringify(JSON.parse(b64(parts[0])), null, 2); } catch {}
  try { p = JSON.parse(b64(parts[1])); body = JSON.stringify(p, null, 2); } catch {}
  const when = (s) => (typeof s === 'number' ? new Date(s * 1000).toLocaleString() : '–');
  const expired = p?.exp && p.exp * 1000 < Date.now();
  return `<pre class="jwt-raw"><span class="j-h">${esc(parts[0])}</span>.<span class="j-p">${esc(parts[1])}</span>.<span class="j-s">${esc(parts[2])}</span></pre>
    <div class="jwt-grid">
      <div><h4 class="j-h">Header</h4><pre>${esc(head)}</pre></div>
      <div><h4 class="j-p">Payload – anybody can read it, nobody can change it</h4><pre>${esc(body)}</pre>
        ${p ? `<p class="small">iat: ${esc(when(p.iat))} · exp: ${esc(when(p.exp))}${expired ? ' · <b>expired</b>' : ''}</p>` : ''}</div>
    </div>
    <p class="small"><b class="j-s">Signature</b>: HMAC-SHA256 of <code>header.payload</code> with <code>JWT_SECRET</code> – only the server can create or check it.</p>`;
}

function mountClientTab() {
  const list = $('#quickList');
  list.innerHTML = '<h3>Log in / register</h3>' + QUICK.map((q, i) => (i === 4 ? '<h3>With the token</h3>' : '') +
    `<button class="titem" type="button" data-q="${i}"><span class="dot" aria-hidden="true"></span><span class="t">${esc(q[0])}</span><span class="tag">${q[1]}</span></button>`).join('');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const [, mt, p, body] = QUICK[+b.dataset.q];
    $('#c-method').value = mt; $('#c-path').value = p; $('#c-body').value = body ? JSON.stringify(body, null, 2) : '';
    sync(); send();
  });
  $('#resetDb').addEventListener('click', async () => { clientDirty = true; await ensureClient(); refreshLog(); toast('Fresh database, empty logs'); });
  renderClient();
}
function sync() {
  client.method = $('#c-method').value;
  client.path = $('#c-path').value.trim() || '/';
  saved.client.token = $('#c-token').value.trim();
  client.body = $('#c-body').value;
  persist();
}
function renderClient() {
  const { mine } = clientFiles();
  $('#clientFiles').innerHTML = mine.length ? mine.map((t) => `<code>${esc(t.file.split('/').pop())}</code>`).join(' ') + ' – the rest is the original solution.' : 'None solved yet – the API is the original solution. Solve tasks in Coding and they appear here.';
  $('#count-client').textContent = saved.client.sent || 0;
  $('#clientScore').textContent = saved.client.sent || 0;
  $('#clientMain').innerHTML = `
  <section class="que">
    <div class="info"><h3>Request</h3><div class="grade">like Postman</div></div>
    <div class="content">
      <div class="reqline">
        <select id="c-method" aria-label="Method">${['GET', 'POST', 'PUT', 'DELETE'].map((x) => `<option ${x === client.method ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <input type="text" id="c-path" value="${esc(client.path)}" aria-label="Path" spellcheck="false">
        <button class="btn primary" type="button" id="c-send">Send</button>
      </div>
      <label class="fld">Authorization: Bearer
        <input type="text" id="c-token" value="${esc(saved.client.token || '')}" placeholder="(no token)" spellcheck="false"></label>
      <div class="actions"><button class="btn ghost" type="button" id="c-clear">Clear token</button><button class="btn ghost" type="button" id="c-tamper">Change one character</button></div>
      <label class="fld">Body (JSON)
        <textarea id="c-body" spellcheck="false">${esc(client.body)}</textarea></label>
      <div class="outcome" id="c-resp" hidden></div>
      <details class="given"><summary>What to try (Step 9 of the lab)</summary><ol class="steps">
        <li>Log in as Ema → 200 with <code>user</code> and <code>token</code>.</li>
        <li>Clear the token and send <code>GET /events</code> → 401 <code>Missing authentication token.</code></li>
        <li>Log in again and send <code>GET /events</code> → 200.</li>
        <li><b>Change one character</b> and send again → 401: the signature does not match any more.</li>
        <li>Read the payload below – no secret is needed to read it. Then look at info.log and error.log.</li></ol></details>
    </div>
  </section>
  <section class="que">
    <div class="info"><h3>Logs</h3><div class="modes log-tabs" role="group" aria-label="Log file">
      <button class="mode" type="button" data-log="info.log" aria-pressed="${client.logTab === 'info.log'}">logs/info.log</button>
      <button class="mode" type="button" data-log="error.log" aria-pressed="${client.logTab === 'error.log'}">logs/error.log</button></div></div>
    <div class="content"><pre class="logbox" id="c-log">…</pre></div>
  </section>
  <section class="que">
    <div class="info"><h3>Token</h3><div class="grade">like jwt.io</div></div>
    <div class="content" id="c-jwt">${jwtHtml(saved.client.token)}</div>
  </section>`;
  const setToken = (tok) => { $('#c-token').value = tok; sync(); $('#c-jwt').innerHTML = jwtHtml(tok); };
  $('#c-send').onclick = () => { sync(); send(); };
  $('#c-path').addEventListener('keydown', (e) => { if (e.key === 'Enter') { sync(); send(); } });
  $('#c-token').addEventListener('input', () => { sync(); $('#c-jwt').innerHTML = jwtHtml(saved.client.token); });
  $('#c-clear').onclick = () => setToken('');
  $('#c-tamper').onclick = () => {
    const parts = $('#c-token').value.trim().split('.');
    if (parts.length !== 3 || parts[1].length < 12) return toast('There is no token to change');
    const i = Math.floor(parts[1].length / 2);
    parts[1] = parts[1].slice(0, i) + (parts[1][i] === 'A' ? 'B' : 'A') + parts[1].slice(i + 1);
    setToken(parts.join('.'));
    toast('One character of the payload changed');
  };
  document.querySelectorAll('[data-log]').forEach((b) => (b.onclick = () => {
    client.logTab = b.dataset.log;
    document.querySelectorAll('[data-log]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    refreshLog();
  }));
  if (client.last) showResponse(client.last);
  ensureClient().then(refreshLog, () => {});
}
function refreshLog() {
  const el = $('#c-log');
  if (!el || !engine) return;
  const text = engine.readLog(client.logTab).trim();
  el.textContent = text ? text.split('\n').slice(-40).join('\n') : '(empty)';
  el.scrollTop = el.scrollHeight;
}
function showResponse(r) {
  const el = $('#c-resp');
  if (!el) return;
  const ok = r.status >= 200 && r.status < 300;
  const body = r.json !== null ? JSON.stringify(r.json, null, 2) : r.text || r.error || '';
  el.hidden = false;
  el.innerHTML = verdictHtml(ok, `${r.status || 'crash'} · ${r.method} ${r.path}`) + `<pre>${esc(body)}</pre><div class="marks">${r.ms} ms</div>`;
}
async function send() {
  const btn = $('#c-send');
  btn.disabled = true;
  try {
    const eng = await ensureClient();
    const body = client.method !== 'GET' && client.method !== 'DELETE' && client.body.trim() ? client.body : undefined;
    const headers = saved.client.token ? { Authorization: 'Bearer ' + saved.client.token } : {};
    const t0 = performance.now();
    const r = await eng.request(client.method, client.path, { headers, body });
    Object.assign(r, { ms: Math.round(performance.now() - t0), method: client.method, path: client.path });
    client.last = r;
    saved.client.sent = (saved.client.sent || 0) + 1;
    $('#count-client').textContent = saved.client.sent; $('#clientScore').textContent = saved.client.sent;
    showResponse(r);
    if (r.json?.token && /^\/auth\/(login|register)/.test(client.path)) {
      $('#c-token').value = r.json.token; saved.client.token = r.json.token;
      $('#c-jwt').innerHTML = jwtHtml(saved.client.token);
      toast('Token copied into the Authorization field');
    }
    persist();
    refreshLog();
  } finally { btn.disabled = false; }
}

/* ====================================================================== reset + start */
let armed = false;
$('#resetAll').addEventListener('click', (e) => {
  if (!armed) {
    armed = true; e.target.textContent = 'Click again to confirm';
    setTimeout(() => { armed = false; if (e.target.isConnected) e.target.textContent = 'Clear all my answers'; }, 3000);
    return;
  }
  saved = { code: {}, client: { sent: 0, token: '' }, tab: saved.tab };
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {}
  location.reload();
});
$('#stat-tasks').textContent = TASKS.length;
updateCodeCounts();
showTab(saved.tab === 'client' ? 'client' : 'code');
bootPhp().catch(() => {});
