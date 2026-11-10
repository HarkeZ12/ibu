/* Assignment 2 prep (FENMS 0121): coding with an in-browser C++ compiler, algorithm tracing,
   and drawing stacks / queues. All state lives in localStorage of this browser only. */
(function () {
"use strict";

/* ====================================================================== storage */
const KEY = "ibu-dsa-a2-prep-v1";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
saved.code = saved.code || {};
saved.trace = saved.trace || {};
saved.draw = saved.draw || {};
let persistTimer = null;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }, 150);
}
window.addEventListener("pagehide", () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} });

/* ====================================================================== theme */
const root = document.documentElement;
try { const t = localStorage.getItem(KEY + "-theme"); if (t) root.dataset.theme = t; } catch (e) {}
document.getElementById("themeBtn").addEventListener("click", () => {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem(KEY + "-theme", root.dataset.theme); } catch (e) {}
  if (window.monaco && window.monaco.editor) window.monaco.editor.setTheme(root.dataset.theme === "dark" ? "a2-dark" : "a2-light");
});
const saverBtn = document.getElementById("battery-saver");
function paintSaver(on) { root.dataset.batterySaver = on ? "true" : "false"; saverBtn.setAttribute("aria-pressed", on); saverBtn.textContent = "Battery saver: " + (on ? "on" : "off"); }
try { paintSaver(localStorage.getItem(KEY + "-saver") === "1"); } catch (e) { paintSaver(false); }
saverBtn.addEventListener("click", () => {
  const on = root.dataset.batterySaver !== "true"; paintSaver(on);
  try { localStorage.setItem(KEY + "-saver", on ? "1" : "0"); } catch (e) {}
});

/* ====================================================================== helpers */
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const newSeed = () => (Math.random() * 4294967295) >>> 0 || 7;
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const RI = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};
function verdictHtml(ok, text) {
  return `<div class="verdict ${ok ? "ok" : "no"}">${ok ? ICON.ok : ICON.no}<span>${esc(text)}</span></div>`;
}
function setStateBadge(el, status) {
  el.className = "state" + (status ? " " + status : "");
  el.textContent = status === "correct" ? "Correct" : status === "incorrect" ? "Incorrect" : status === "answered" ? "Answer saved" : status === "seen" ? "Answer viewed" : "Not complete";
}

/* ====================================================================== tabs */
const tabs = [...document.querySelectorAll(".tab")];
const mounted = {};
function showTab(name) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
    document.getElementById("panel-" + t.dataset.tab).hidden = !on;
  });
  saved.tab = name; persist();
  if (!mounted[name]) { mounted[name] = true; ({ code: mountCodeTab, trace: mountTraceTab, draw: mountDrawTab })[name](); }
  if (name === "code") Cxx.maybeAutoWarm();
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => showTab(t.dataset.tab));
  t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); showTab(n.dataset.tab);
  });
});

/* ====================================================================== C++ compiler client */
const Cxx = (() => {
  const box = document.getElementById("compilerBox");
  const stateEl = document.getElementById("compilerState");
  const bar = $(".bar", box), barFill = $(".bar i", box);
  const loadBtn = document.getElementById("compilerLoad");
  const note = document.getElementById("compilerNote");
  const CACHED = KEY + "-compiler-loaded";
  let worker = null, ready = false, warming = null, job = null, seq = 0;
  const queue = [];

  function ui(state, text, pct) {
    box.classList.remove("loading", "ready", "failed");
    if (state) box.classList.add(state);
    stateEl.textContent = text;
    bar.hidden = pct === undefined;
    if (pct !== undefined) barFill.style.width = Math.max(2, pct) + "%";
    loadBtn.hidden = state === "ready" || state === "loading";
  }
  function spawn() {
    worker = new Worker("cxx-worker.js", { type: "module" });
    worker.onmessage = onMessage;
    worker.onerror = (e) => { failAll("The compiler worker could not start" + (e && e.message ? ": " + e.message : ".")); };
  }
  function onMessage(e) {
    const m = e.data;
    if (m.type === "progress") {
      const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
      ui("loading", `Downloading the compiler… ${pct}%`, pct);
      return;
    }
    if (m.type === "ready") {
      ready = true; ui("ready", "Ready");
      try { localStorage.setItem(CACHED, "1"); } catch (err) {}
      if (warming) { warming.resolve(); warming = null; }
      pump();
      return;
    }
    if (m.type === "error" && !job) { failAll(m.message); return; }
    if (!job || m.id !== job.id) return;
    if (m.type === "compiled") {
      ready = true; ui("ready", "Ready");
      try { localStorage.setItem(CACHED, "1"); } catch (err) {}
      job.compile = { ok: m.ok, stderr: m.stderr, ms: m.ms };
      job.onUpdate && job.onUpdate({ phase: "running" });
      if (!m.ok) finish(); else arm();
    } else if (m.type === "test-start") { job.running = m.i; arm(); }
    else if (m.type === "test") { job.results[m.i] = m; }
    else if (m.type === "done") { finish(); }
    else if (m.type === "error") { const j = job; job = null; clearTimeout(j.timer); j.reject(new Error(m.message)); restart(); pump(); }
  }
  function arm() {
    clearTimeout(job.timer);
    job.timer = setTimeout(() => {
      const j = job; if (!j) return;
      if (j.running !== undefined) j.results[j.running] = { timeout: true };
      for (let i = 0; i < j.tests; i++) if (!j.results[i]) j.results[i] = { skipped: true };
      restart();
      finish();
    }, 4000);
  }
  function restart() {
    if (worker) worker.terminate();
    worker = null; ready = false;
    ui("", "Restarting after a stopped program…");
  }
  function finish() {
    const j = job; job = null; clearTimeout(j.timer);
    j.resolve({ compile: j.compile, results: j.results });
    pump();
  }
  function failAll(msg) {
    ui("failed", "Could not load the compiler");
    note.textContent = "The compiler is downloaded from cdn.jsdelivr.net (or unpkg.com) the first time, so an internet connection is needed once. " + (msg || "");
    if (worker) worker.terminate();
    worker = null; ready = false;
    if (warming) { warming.reject(new Error(msg)); warming = null; }
    if (job) { const j = job; job = null; clearTimeout(j.timer); j.reject(new Error(msg)); }
    while (queue.length) queue.shift().reject(new Error(msg));
  }
  function warm() {
    if (ready) return Promise.resolve();
    if (warming) return warming.promise;
    if (!worker) spawn();
    let resolve, reject;
    const promise = new Promise((a, b) => { resolve = a; reject = b; });
    warming = { promise, resolve, reject };
    ui("loading", "Loading the compiler…", 0);
    worker.postMessage({ type: "warm" });
    return promise;
  }
  function pump() {
    if (job || !queue.length) return;
    if (!worker) spawn();
    if (warming) return; // run after warm-up
    job = queue.shift();
    if (!ready) ui("loading", "Loading the compiler…", 0);
    worker.postMessage({ type: "run", id: job.id, source: job.source, tests: job.tests });
  }
  function run(source, tests, onUpdate) {
    return new Promise((resolve, reject) => {
      queue.push({ id: ++seq, source, tests, onUpdate, resolve, reject, results: new Array(tests).fill(null) });
      pump();
    });
  }
  loadBtn.addEventListener("click", () => { warm().catch(() => {}); });
  function maybeAutoWarm() {
    let cached = false;
    try { cached = localStorage.getItem(CACHED) === "1"; } catch (e) {}
    const saveData = navigator.connection && navigator.connection.saveData;
    if (cached && !saveData) warm().catch(() => {});
  }
  return { run, warm, maybeAutoWarm, isReady: () => ready };
})();

/* ====================================================================== CODING */
const BANK = window.CODE_BANK;
const TASKS = BANK.tasks;
const GAP = "// ??? missing line";

function codeStatus(id) { const s = saved.code[id]; return s && s.status; }
function updateCodeCounts() {
  const solved = TASKS.filter((t) => codeStatus(t.id) === "correct").length;
  document.getElementById("count-code").textContent = `${solved}/${TASKS.length}`;
  const sc = document.getElementById("codeScore"); if (sc) sc.textContent = `${solved} / ${TASKS.length}`;
}

function makeGaps(solution, seed) {
  const lines = solution.replace(/\n+$/, "").split("\n");
  const firstBrace = lines.findIndex((l) => l.includes("{"));
  const cands = [];
  lines.forEach((l, i) => {
    const t = l.trim();
    if (i <= firstBrace) return;
    if (!t || /^[{}]+;?$/.test(t) || t === "} else {" || t === "else {" || t.startsWith("//") || t === "};") return;
    cands.push(i);
  });
  const r = rng(seed);
  const want = Math.min(cands.length, r() < 0.45 ? 1 : r() < 0.6 ? 2 : 3);
  const chosen = new Set();
  while (chosen.size < want) chosen.add(cands[Math.floor(r() * cands.length)]);
  const text = lines.map((l, i) => chosen.has(i) ? l.match(/^\s*/)[0] + GAP : l).join("\n") + "\n";
  return { text, gaps: [...chosen].sort((a, b) => a - b) };
}

function demangle(out) {
  return out.replace(/@@THROW@@([^@]*)@@\n?/g, (m, name) => {
    const mm = name.match(/^St(\d+)(\w+)$/);
    if (mm) name = "std::" + mm[2].slice(0, +mm[1]);
    else if (name === "PKc") name = "const char*";
    return `[throws ${name}]`;
  });
}
const norm = (s) => s.replace(/[ \t]+$/gm, "").replace(/\n+$/, "");

function buildSource(task, user) {
  const prefix = task.lib.map((n) => BANK.snippets[n]).join("\n") + "\n";
  const userStart = prefix.split("\n").length; // 1-based line where user code starts
  const userLines = user.split("\n").length;
  let main = "\nint main(int argc, char** argv) {\n    int t = argc > 1 ? std::atoi(argv[1]) : -1;\n    switch (t) {\n";
  task.tests.forEach((t, i) => {
    main += `    case ${i}: {\n${t.code.split("\n").map((l) => "        " + l).join("\n")}\n        break;\n    }\n`;
  });
  main += "    }\n    std::cout << std::flush;\n    return 0;\n}\n";
  return { source: prefix + user + "\n" + main, userStart, userLines };
}
function mapDiagnostics(stderr, userStart, userLines) {
  let txt = stderr.replace(/main\.cpp:(\d+):(\d+)/g, (m, l, c) => {
    l = +l;
    if (l >= userStart && l < userStart + userLines) return `your code, line ${l - userStart + 1}:${c}`;
    if (l < userStart) return `given code (line ${l})`;
    return "test code";
  });
  // the source excerpt under each diagnostic carries absolute line numbers: renumber them
  txt = txt.replace(/^(\s*)(\d+)( \| )/gm, (m, sp, l, bar) => {
    l = +l;
    const shown = l >= userStart && l < userStart + userLines ? String(l - userStart + 1) : "";
    return sp + shown.padStart(l.toString().length, " ") + bar;
  });
  const lines = txt.split("\n");
  if (lines.length > 80) txt = lines.slice(0, 80).join("\n") + "\n…";
  return txt.trim();
}

function mountCodeTab() {
  const list = document.getElementById("codeList");
  let html = "", lastGroup = null;
  TASKS.forEach((t, i) => {
    if (t.group !== lastGroup) { html += `<h3>${esc(t.group)}</h3>`; lastGroup = t.group; }
    html += `<button class="titem" type="button" data-id="${t.id}"><span class="dot" aria-hidden="true"></span><span class="t">${esc(t.title)}</span><span class="tag">${i + 1}</span></button>`;
  });
  list.innerHTML = html;
  list.addEventListener("click", (e) => { const b = e.target.closest(".titem"); if (b) openTask(b.dataset.id, true); });
  paintCodeList();
  const first = TASKS.find((t) => t.id === saved.codeSel) || TASKS[0];
  openTask(first.id, false);
}
function paintCodeList() {
  document.querySelectorAll("#codeList .titem").forEach((b) => {
    const s = saved.code[b.dataset.id];
    b.classList.remove("correct", "incorrect", "answered");
    if (s && s.status) b.classList.add(s.status);
    else if (s && s.touched) b.classList.add("answered");
    b.setAttribute("aria-current", b.dataset.id === saved.codeSel);
    const label = s && s.status === "correct" ? ", solved" : s && s.status === "incorrect" ? ", not passing yet" : "";
    b.setAttribute("aria-label", $(".t", b).textContent + label);
  });
  updateCodeCounts();
}


/* ---------- Monaco (the VS Code editor) with C++ suggestions ---------- */
const MONACO = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs";
let monacoPromise = null;
function monacoTheme() {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "a2-dark" : "a2-light";
}
function loadMonaco() {
  if (window.monaco && window.monaco.editor) return Promise.resolve(window.monaco);
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    window.MonacoEnvironment = {
      getWorkerUrl: () => URL.createObjectURL(new Blob([`self.MonacoEnvironment={baseUrl:"${MONACO}/../"};importScripts("${MONACO}/base/worker/workerMain.js");`], { type: "text/javascript" })),
    };
    const s = document.createElement("script");
    s.src = MONACO + "/loader.js";
    s.onerror = () => reject(new Error("editor did not load"));
    s.onload = () => {
      window.require.config({ paths: { vs: MONACO } });
      window.require(["vs/editor/editor.main"], () => { setupMonaco(window.monaco); resolve(window.monaco); }, reject);
    };
    document.head.appendChild(s);
  });
  monacoPromise.catch(() => { monacoPromise = null; });
  return monacoPromise;
}
const CPP_KEYWORDS = ("auto bool break case catch char class const continue default delete do double else enum explicit false float for friend " +
  "if inline int long namespace new noexcept nullptr operator private protected public return short signed sizeof static struct switch " +
  "template this throw true try typename unsigned using virtual void while").split(" ");
const STD_NAMES = ["std::swap", "std::move", "std::out_of_range", "std::string", "std::cout", "std::endl", "std::stod", "std::stol", "std::stoi",
  "std::getline", "std::stringstream", "std::istringstream", "std::fmod", "std::pow", "std::initializer_list", "std::runtime_error"];
const SNIPS = [
  ["for", "for (int ${1:i} = ${2:0}; ${1:i} < ${3:len}; ${1:i}++) {\n\t$0\n}", "for loop"],
  ["forj", "for (int ${1:j} = ${2:i}; ${1:j} > ${3:0}; ${1:j}--) {\n\t$0\n}", "for loop counting down"],
  ["while", "while (${1:condition}) {\n\t$0\n}", "while loop"],
  ["if", "if (${1:condition}) {\n\t$0\n}", "if statement"],
  ["ifelse", "if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}", "if / else"],
  ["else", "else {\n\t$0\n}", "else block"],
  ["newnode", "Node<Data>* ${1:new_node} = new Node<Data>();\n${1:new_node}->data = ${2:data};", "create a node"],
  ["throwempty", "throw std::out_of_range(\"${1:Stack is empty}\");", "throw out_of_range"],
  ["templ", "template<typename Data>", "template header"],
];
function contextWords(task) {
  const text = [task.show || "", ...task.lib.filter((n) => !["head", "tracker", "counted", "use_std"].includes(n)).map((n) => BANK.snippets[n] || "")].join("\n");
  const words = new Map();
  for (const m of text.matchAll(/\b([A-Za-z_][A-Za-z0-9_]{2,})\b(\s*\()?/g)) {
    const w = m[1];
    if (CPP_KEYWORDS.includes(w) || w === "std") continue;
    const kind = m[2] ? "method" : /^[A-Z]/.test(w) ? "class" : "field";
    if (!words.has(w) || kind === "method") words.set(w, kind);
  }
  return [...words.entries()];
}
function setupMonaco(m) {
  m.editor.defineTheme("a2-light", { base: "vs", inherit: true, rules: [], colors: {
    "editor.background": "#fbfbff", "editor.lineHighlightBackground": "#eef0ff", "editorLineNumber.foreground": "#9aa0c0",
    "editorLineNumber.activeForeground": "#5a46f0", "editorCursor.foreground": "#5a46f0" } });
  m.editor.defineTheme("a2-dark", { base: "vs-dark", inherit: true, rules: [], colors: {
    "editor.background": "#0b0f22", "editor.lineHighlightBackground": "#141a38", "editorLineNumber.foreground": "#4f5878",
    "editorLineNumber.activeForeground": "#a191ff", "editorCursor.foreground": "#a191ff" } });
  m.editor.setTheme(monacoTheme());
  const K = m.languages.CompletionItemKind, R = m.languages.CompletionItemInsertTextRule;
  m.languages.registerCompletionItemProvider("cpp", {
    triggerCharacters: [":", ">", "."],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      const member = /(->|\.)\s*$/.test(before), scoped = /std::$/.test(before);
      const out = [], seen = new Set();
      const add = (label, kind, insertText, detail, snippet, sort) => {
        if (seen.has(label)) return; seen.add(label);
        out.push({ label, kind, insertText: insertText || label, detail, range, sortText: sort || "5" + label, insertTextRules: snippet ? R.InsertAsSnippet : undefined });
      };
      if (scoped) {
        STD_NAMES.forEach((n) => add(n.slice(5), K.Class, null, "std", false, "1"));
        return { suggestions: out };
      }
      editorContext.forEach(([w, kind]) => add(w, kind === "method" ? K.Method : kind === "class" ? K.Class : K.Field, null, "from the lab code", false, member ? "1" + w : "3" + w));
      if (!member) {
        SNIPS.forEach(([label, body, detail]) => add(label, K.Snippet, body, detail, true, "2" + label));
        CPP_KEYWORDS.forEach((w) => add(w, K.Keyword, null, "keyword", false, "4" + w));
        STD_NAMES.forEach((n) => add(n, K.Class, null, "standard library", false, "6" + n));
      }
      const mine = new Set(model.getValue().match(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) || []);
      mine.delete(word.word);
      mine.forEach((w) => add(w, K.Variable, null, "in your code", false, "3" + w));
      return { suggestions: out };
    },
  });
}
let activeEditor = null, viewToken = 0, editorContext = [];
function openTask(id, scroll) {
  const myView = ++viewToken;
  if (activeEditor && activeEditor.dispose) { activeEditor.dispose(); activeEditor = null; }
  const idx = TASKS.findIndex((t) => t.id === id);
  const task = TASKS[idx];
  saved.codeSel = id; persist();
  const st = saved.code[id] = saved.code[id] || {};
  if (!task.linemodes) st.mode = "method";
  st.mode = st.mode || (task.linemodes ? "lines" : "method");
  st.text = st.text || {};
  if (task.linemodes && !st.seed) st.seed = newSeed();

  const main = document.getElementById("codeMain");
  const desc = (task.descHtml || `<p>${esc(task.desc)}</p>`) + (task.descNote ? `<p class="small">${task.descNote.trim()}</p>` : "");
  const where = task.kind === "lab" ? `Week ${task.week} · ${task.group.split(" · ")[0]}` : task.group;
  main.innerHTML = `
  <section class="que" aria-labelledby="codeTitle">
    <div class="info">
      <h3 id="codeTitle">Task <b>${idx + 1}</b> of ${TASKS.length}: ${esc(task.title)}</h3>
      <div class="state">Not complete</div>
      <div class="grade">${esc(where)}</div>
    </div>
    <div class="content">
      <div class="formulation">
        ${desc}
        <p class="modehint"></p>
        <div class="prompt"><span>Answer:</span><span class="regime">${task.tests.length} tests</span></div>
      </div>
      ${task.show ? `<details class="given"><summary>Given code (already part of the program)</summary><p>${task.kind === "lab" ? "This is the course code from the lab. Every other method is already implemented exactly as in the lab, so you can call them." : "This is already in the program; you only write your answer."}</p><pre><code>${esc(task.show)}</code></pre></details>` : ""}
      ${task.linemodes ? `<div class="modes" role="group" aria-label="Mode"><span class="label">Mode:</span>
        <button class="mode" type="button" data-mode="lines">Missing lines</button>
        <button class="mode" type="button" data-mode="method">Whole method</button></div>` : ""}
      <div class="answer"><div class="editor"><textarea spellcheck="false" aria-label="Your answer"></textarea></div></div>
      <p class="editor-hint">Suggestions pop up while you type: <span class="kbd">↑</span> <span class="kbd">↓</span> to choose, <span class="kbd">Tab</span> or <span class="kbd">Enter</span> to insert, <span class="kbd">Ctrl</span>+<span class="kbd">Space</span> to open them. Type <code>for</code>, <code>while</code>, <code>if</code> or <code>newnode</code> for a ready-made template.</p>
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
    <button class="btn ghost prev" type="button" ${idx === 0 ? "disabled" : ""}>← Previous task</button>
    <button class="btn ghost next" type="button" ${idx === TASKS.length - 1 ? "disabled" : ""}>Next task →</button>
  </div>`;
  const sec = $(".que", main), out = $(".outcome", sec), stateEl = $(".state", sec);
  setStateBadge(stateEl, st.status || (st.touched ? "answered" : ""));
  $(".prev", main).addEventListener("click", () => openTask(TASKS[idx - 1].id, true));
  $(".next", main).addEventListener("click", () => openTask(TASKS[idx + 1].id, true));
  paintCodeList();

  const starterFor = (mode) => mode === "lines" ? makeGaps(task.solution, st.seed).text : task.starter;
  let revision = 0, warmed = false;
  const ta = $("textarea", sec);
  const edBox = $(".editor", sec);
  let ed = null, decos = null, quiet = false; // Monaco editor once it has loaded; the textarea until then
  ta.addEventListener("keydown", (e) => { if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); } });
  ta.addEventListener("input", () => onChange());
  const getVal = () => ed ? ed.getValue() : ta.value;
  function setVal(v) {
    quiet = true;
    if (ed) { ed.setValue(v); } else ta.value = v;
    quiet = false;
    markGaps();
  }
  function markGaps() {
    if (!ed || !window.monaco) return;
    const model = ed.getModel(), ranges = [];
    for (let i = 1; i <= model.getLineCount(); i++) {
      if (model.getLineContent(i).includes(GAP)) ranges.push({ range: new monaco.Range(i, 1, i, 1), options: { isWholeLine: true, className: "monaco-gap" } });
    }
    if (decos) decos.set(ranges); else decos = ed.createDecorationsCollection(ranges);
  }
  editorContext = contextWords(task);
  loadMonaco().then((m) => {
    if (myView !== viewToken) return; // the user already moved to another task
    const value = ta.value;
    edBox.innerHTML = '<div class="monaco-host"></div>';
    const host = $(".monaco-host", edBox);
    // Suggestions/hovers go in a node on <body>: the glass card's backdrop-filter would make
    // their position:fixed relative to the card, so they jumped up once the page was scrolled.
    let overflow = document.getElementById("monaco-overflow");
    if (!overflow) {
      overflow = document.createElement("div");
      overflow.id = "monaco-overflow"; overflow.className = "monaco-editor";
      overflow.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:60";
      document.body.appendChild(overflow);
    }
    ed = m.editor.create(host, {
      value, language: "cpp", theme: monacoTheme(), automaticLayout: true,
      fontFamily: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace", fontSize: 14, lineHeight: 21,
      tabSize: 4, insertSpaces: true, detectIndentation: false, minimap: { enabled: false },
      scrollBeyondLastLine: false, scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 10 },
      padding: { top: 10, bottom: 10 }, renderLineHighlight: "line", roundedSelection: true,
      quickSuggestions: { other: true, comments: false, strings: false }, suggestOnTriggerCharacters: true,
      wordBasedSuggestions: "off", snippetSuggestions: "top", tabCompletion: "on", acceptSuggestionOnEnter: "on",
      suggest: { showWords: true, preview: true }, autoClosingBrackets: "always", autoClosingQuotes: "always",
      autoIndent: "full", bracketPairColorization: { enabled: true }, fixedOverflowWidgets: true, overflowWidgetsDomNode: overflow,
      ariaLabel: "Your answer (C++ editor)",
    });
    activeEditor = ed;
    const fit = () => { host.style.height = Math.max(240, Math.min(ed.getContentHeight(), 680)) + "px"; ed.layout(); };
    ed.onDidContentSizeChange(fit); fit();
    ed.onDidChangeModelContent(() => { if (!quiet) onChange(); });
    markGaps();
  }).catch(() => { /* keep the plain textarea */ });

  function onChange() {
    revision++;
    st.text[st.mode] = getVal(); st.touched = true;
    st.status = null; out.hidden = true; // an old result or a running check no longer matches the code
    setStateBadge(stateEl, "answered");
    persist(); paintCodeList(); markGaps();
    if (!warmed) { warmed = true; Cxx.warm().catch(() => {}); }
  }

  function applyMode() {
    revision++; // any check still running belongs to the old text
    const mode = st.mode;
    sec.querySelectorAll(".mode").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === mode));
    $(".newgaps", sec).hidden = mode !== "lines";
    $(".modehint", sec).innerHTML = mode === "lines"
      ? `Some lines were removed and replaced with <code>${esc(GAP)}</code>. Write the missing code in their place.`
      : task.kind === "lab" ? "Write the whole body so that it behaves exactly like the lab version." : "";
    $(".modehint", sec).hidden = !$(".modehint", sec).innerHTML;
    const v = typeof st.text[mode] === "string" ? st.text[mode] : starterFor(mode);
    setVal(v);
    renderSolution();
  }
  sec.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => {
    if (st.mode === b.dataset.mode) return;
    st.mode = b.dataset.mode; st.status = null; out.hidden = true; persist(); applyMode();
    setStateBadge(stateEl, st.text[st.mode] ? "answered" : ""); paintCodeList();
  }));
  $(".newgaps", sec).addEventListener("click", () => {
    st.seed = newSeed(); delete st.text.lines; st.status = null; out.hidden = true; persist(); applyMode();
    setStateBadge(stateEl, ""); paintCodeList();
  });
  $(".reset", sec).addEventListener("click", () => {
    delete st.text[st.mode]; st.status = null; st.touched = false; out.hidden = true; persist(); applyMode();
    setStateBadge(stateEl, ""); paintCodeList();
  });

  function renderSolution() {
    const gaps = st.mode === "lines" ? new Set(makeGaps(task.solution, st.seed).gaps) : new Set();
    const lines = task.solution.replace(/\n+$/, "").split("\n");
    const code = lines.map((l, i) => gaps.has(i) ? `<span class="gapline">${esc(l)}</span>` : esc(l)).join("\n");
    $(".solbody", sec).innerHTML = `<pre><code>${code}</code></pre>` +
      (gaps.size ? "<p>The highlighted lines are the ones that were removed.</p>" : "") +
      (task.solutionNote || (task.kind === "lab" ? "<p>This is the implementation from the course repository (Lab code).</p>" : ""));
  }

  const btn = $(".check", sec);
  btn.addEventListener("click", async () => {
    const user = getVal();
    if (user.includes(GAP)) {
      out.hidden = false;
      out.innerHTML = verdictHtml(false, "Some missing lines are still empty") + "<div>Replace every <code>" + esc(GAP) + "</code> line with code first.</div>";
      return;
    }
    const checkedRevision = revision;
    const { source, userStart, userLines } = buildSource(task, user);
    btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Checking…';
    out.hidden = false;
    out.innerHTML = `<div class="marks">${Cxx.isReady() ? "Compiling and running your code…" : "Loading the compiler (the first time takes a while), then compiling…"}</div>`;
    try {
      const current = () => checkedRevision === revision && myView === viewToken;
      const r = await Cxx.run(source, task.tests.length, () => { if (current()) out.innerHTML = '<div class="marks">Running the tests…</div>'; });
      if (!current()) return;
      if (!r.compile.ok) {
        out.innerHTML = verdictHtml(false, "Compilation failed") + `<pre>${esc(mapDiagnostics(r.compile.stderr, userStart, userLines))}</pre>`;
        st.status = "incorrect";
      } else {
        let pass = 0;
        const rows = task.tests.map((t, i) => {
          const res = r.results[i] || { skipped: true };
          let got, note = "";
          if (res.timeout) { got = ""; note = "Stopped: ran for more than 4 seconds (endless loop?)"; }
          else if (res.skipped) { got = ""; note = "Not run"; }
          else {
            got = demangle(res.stdout || "");
            if (res.trap) note = "Crashed: " + friendlyTrap(res.trap);
            else if (res.code && res.code !== 0) note = `Exit code ${res.code}`;
          }
          const ok = !note && norm(got) === norm(t.expected);
          if (ok) pass++;
          return `<tr class="${ok ? "pass" : "fail"}"><td class="mark">${ok ? "✓" : "✗"}</td><td><pre>${esc(t.code)}</pre></td><td><pre>${esc(t.expected)}</pre></td><td><pre>${esc(norm(got))}</pre>${note ? `<div class="ex">${esc(note)}</div>` : ""}</td></tr>`;
        }).join("");
        const all = pass === task.tests.length;
        out.innerHTML = verdictHtml(all, all ? "Passed all tests!" : `Passed ${pass} of ${task.tests.length} tests`) +
          `<div class="results"><table><thead><tr><th></th><th>Test</th><th>Expected</th><th>Got</th></tr></thead><tbody>${rows}</tbody></table></div>` +
          `<div class="marks">Compiled in ${(r.compile.ms / 1000).toFixed(1)} s.</div>`;
        st.status = all ? "correct" : "incorrect";
      }
      persist(); setStateBadge(stateEl, st.status); paintCodeList();
    } catch (err) {
      out.innerHTML = verdictHtml(false, "Could not run the compiler") + `<div class="marks">${esc(err.message || err)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = "Check";
    }
  });

  applyMode();
  if (scroll) sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
function friendlyTrap(t) {
  if (/out of bounds/i.test(t)) return "memory access out of bounds (for example a nullptr or a deleted node was followed).";
  if (/unreachable/i.test(t)) return "the program aborted (for example a function that must return a value reached its end without return).";
  if (/call stack|stack overflow|too much recursion/i.test(t)) return "stack overflow (endless recursion?).";
  return t;
}

/* ====================================================================== TRACING */
const ALGOS = {
  binary_search: { label: "Binary search", lab: "Lab 04", code:
`template<typename Data>
int Search::binary_search(const Data *elements, const int len, const Data &key) {
    int low = 0;
    int high = len - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (key == elements[mid]) {
            return mid;
        } else if (key < elements[mid]) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return -1;
}` },
  bubble_sort: { label: "Bubble sort", lab: "Lab 04", code:
`template<typename Data>
void Sort::bubble_sort(Data *arr, const int len) {
    for (int i = 0; i < len; i++) {
        bool swapped = false;
        for (int j = 1; j < len - i; j++) {
            if (arr[j] < arr[j - 1]) {
                swap(arr, j, j - 1);
                swapped = true;
            }
        }
        if (!swapped) {
            break;
        }
    }
}` },
  selection_sort: { label: "Selection sort", lab: "Lab 05", code:
`template<typename Data>
void ElementarySort::selection_sort(Data *arr, const int len) {
    for (int i = 0; i < len; i++) {
        int min = i;
        for (int j = i + 1; j < len; j++) {
            if (arr[j] < arr[min]) {
                min = j;
            }
        }
        swap(arr, min, i);
    }
}` },
  insertion_sort: { label: "Insertion sort", lab: "Lab 05", code:
`template<typename Data>
void ElementarySort::insertion_sort(Data *arr, const int len) {
    for (int i = 1; i < len; i++) {
        for (int j = i; j > 0; j--) {
            if (arr[j] < arr[j - 1]) {
                swap(arr, j, j - 1);
            } else {
                break;
            }
        }
    }
}` },
  shell_sort: { label: "Shell sort", lab: "Lab 05", code:
`template<typename Data>
void ElementarySort::shell_sort(Data *arr, const int len) {
    int h = 1;
    while (h < len / 3) {
        h = 3 * h + 1;
    }

    while (h >= 1) {
        for (int i = h; i < len; i++) {
            for (int j = i; j >= h; j -= h) {
                if (arr[j] < arr[j - h]) {
                    swap(arr, j, j - h);
                } else {
                    break;
                }
            }
        }
        h = h / 3;
    }
}` },
  linear_search: { label: "Linear search", lab: "Lab 04", hidden: true, code:
`template<typename Data>
int Search::linear_search(const Data* elements, const int len, const Data& key) {
    for (int i = 0; i < len; i++) {
        if (elements[i] == key) {
            return i;
        }
    }
    return -1;
}` },
  insertion_swaps: { label: "Insertion sort (every swap)", lab: "Lab 05", hidden: true },
  selection_sort_max: { label: "Selection sort (max)", lab: "Lab 05", hidden: true, code:
`template<typename Data>
void selection_sort_max(Data *arr, int len) {
   for (int i = len - 1; i > 0; i--) {
       int max = i;
       for (int j = i - 1; j >= 0; j--) {
           if (arr[j] > arr[max]) {
               max = j;
           }
       }
       swap(arr, max, i);
   }
}` },
};
ALGOS.insertion_swaps.code = ALGOS.insertion_sort.code;
const INSTR = {
  binary_search: "Add one iteration for each value of mid computed, and place low, mid and high as they are when mid is computed.",
  linear_search: "Add one iteration for each element compared with the key, and place i on that element.",
  bubble_sort: "Show the array after each iteration of the outer loop that makes at least one swap (the last pass, which finds nothing to swap and stops the loop, is not shown).",
  selection_sort: "Show the array after each iteration of the outer loop, for i = 0 to i = len - 2.",
  insertion_sort: "Show the array after each iteration of the outer loop.",
  shell_sort: "Add one iteration for each value of h, and show the array after that h-sort finishes.",
  insertion_swaps: "You need to provide an iteration whenever a swap happens in the algorithm. Each swap is considered a new iteration (which is different from how iterations are defined in the base algorithm itself).",
  selection_sort_max: "Show the array after each iteration of the outer loop.",
};
const STUDENT_SNIPPET = `struct Student {
    const char* name;
    const char* department;
    double gpa;
    // constructor omitted
    friend bool operator<(const Student &s1, const Student &s2) { return s1.gpa < s2.gpa; }
    friend bool operator==(const Student &s1, const Student &s2) { return s1.gpa == s2.gpa; }
    // remaining operators are built from < and ==
};`;
const STUDENT_CALL = `Student students[] = {
    Student("Amina", "IT", 78),
    Student("Kenan", "IT", 92),
    Student("Lejla", "IT", 65),
    Student("Tarik", "IT", 88),
    Student("Sara", "IT", 71),
    Student("Emir", "IT", 84)
};
Sort::bubble_sort(students, 6);`;
const TRACE_PRESETS = [
  { id: "p4-4", title: "Practice 04 · Q4 binary search", q: { algo: "binary_search", data: [4, 9, 13, 20, 26, 31, 38, 45, 52, 60, 71], target: 33, ask: "all" } },
  { id: "p4-5", title: "Practice 04 · Q5 bubble sort", q: { algo: "bubble_sort", data: [29, 10, 14, 37, 13, 5, 22, 8], ask: [2, 5] } },
  { id: "p4-6", title: "Practice 04 · Q6 bubble sort (students)", students: true, q: { algo: "bubble_sort", data: [78, 92, 65, 88, 71, 84], ask: "all" } },
  { id: "p4-7", title: "Practice 04 · Q7 linear search", q: { algo: "linear_search", data: [9, 3, 17, 11, 6], target: 10, ask: "all" } },
  { id: "p4-8", title: "Practice 04 · Q8 binary search", q: { algo: "binary_search", data: [4, 9, 13, 20, 26, 31, 38, 45, 52, 60, 71], target: 45, ask: "all" } },
  { id: "p5-4", title: "Practice 05 · Q4 Shell sort", q: { algo: "shell_sort", data: [5, -1, 23, 8, 17, 4, 2, 6], ask: "all" } },
  { id: "p5-5", title: "Practice 05 · Q5 Shell sort", q: { algo: "shell_sort", data: [62, 17, 45, 8, 91, 33, 76, 24, 5, 58, 12, 83, 39, 10, 28], ask: "all" } },
  { id: "p5-6", title: "Practice 05 · Q6 insertion sort", q: { algo: "insertion_sort", data: [5, -1, 23, 8, 17, 4, 2, 6], ask: "all" } },
  { id: "p5-7", title: "Practice 05 · Q7 insertion (swaps)", q: { algo: "insertion_swaps", data: [31, 17, 42, 9, 25], ask: "all" } },
  { id: "p5-8", title: "Practice 05 · Q8 selection sort", q: { algo: "selection_sort", data: [5, -1, 23, 8, 17, 4, 2, 6], ask: "all" } },
  { id: "p5-9", title: "Practice 05 · Q9 selection sort", q: { algo: "selection_sort", data: [11, 19, 24, 36, 42, 58], ask: "all" } },
  { id: "p5-10", title: "Practice 05 · Q10 selection (max)", q: { algo: "selection_sort_max", data: [26, 8, 41, 15, 33, 3, 19], ask: "all" } },
];

function expectedSteps(q) {
  const a = q.data;
  if (q.algo === "binary_search") {
    const steps = []; let low = 0, high = a.length - 1;
    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      steps.push({ low, mid, high });
      if (q.target === a[mid]) break;
      else if (q.target < a[mid]) high = mid - 1; else low = mid + 1;
    }
    return steps;
  }
  if (q.algo === "linear_search") {
    const steps = [];
    for (let i = 0; i < a.length; i++) { steps.push({ i }); if (a[i] === q.target) break; }
    return steps;
  }
  const arr = a.slice(), rows = [], n = arr.length, sw = (i, j) => { [arr[i], arr[j]] = [arr[j], arr[i]]; };
  if (q.algo === "bubble_sort") {
    for (let i = 0; i < n; i++) {
      let swapped = false;
      for (let j = 1; j < n - i; j++) if (arr[j] < arr[j - 1]) { sw(j, j - 1); swapped = true; }
      if (!swapped) break;
      rows.push(arr.slice());
    }
    if (Array.isArray(q.ask)) return q.ask.map((k) => ({ arr: (rows[k - 1] || rows[rows.length - 1] || a).slice() }));
  } else if (q.algo === "shell_sort") {
    let h = 1; while (h < Math.floor(n / 3)) h = 3 * h + 1;
    while (h >= 1) {
      for (let i = h; i < n; i++) for (let j = i; j >= h && arr[j] < arr[j - h]; j -= h) sw(j, j - h);
      rows.push(arr.slice()); h = Math.floor(h / 3);
    }
  } else if (q.algo === "insertion_sort" || q.algo === "insertion_swaps") {
    for (let i = 1; i < n; i++) {
      for (let j = i; j > 0 && arr[j] < arr[j - 1]; j--) { sw(j, j - 1); if (q.algo === "insertion_swaps") rows.push(arr.slice()); }
      if (q.algo === "insertion_sort") rows.push(arr.slice());
    }
  } else if (q.algo === "selection_sort") {
    for (let i = 0; i < n - 1; i++) { let m = i; for (let j = i + 1; j < n; j++) if (arr[j] < arr[m]) m = j; sw(m, i); rows.push(arr.slice()); }
  } else if (q.algo === "selection_sort_max") {
    for (let i = n - 1; i > 0; i--) { let m = i; for (let j = i - 1; j >= 0; j--) if (arr[j] > arr[m]) m = j; sw(m, i); rows.push(arr.slice()); }
  }
  return rows.map((r) => ({ arr: r }));
}

function distinct(r, n, lo, hi) {
  const s = new Set();
  while (s.size < n) s.add(RI(r, lo, hi));
  return [...s];
}
function genTrace(algo, seed) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 100; attempt++) {
    let q;
    if (algo === "binary_search") {
      const n = RI(r, 9, 15);
      const data = distinct(r, n, 1, 99).sort((x, y) => x - y);
      let target;
      if (r() < 0.6) target = data[RI(r, 0, n - 1)];
      else { do target = RI(r, 0, 100); while (data.includes(target)); }
      q = { algo, data, target, ask: "all" };
      if (expectedSteps(q).length < 2) continue;
    } else if (algo === "shell_sort") {
      q = { algo, data: distinct(r, RI(r, 10, 16), 1, 99), ask: "all" };
    } else {
      const data = distinct(r, RI(r, 6, 8), 1, 99);
      if (r() < 0.2) data[RI(r, 0, data.length - 1)] = -RI(r, 1, 9);
      q = { algo, data, ask: "all" };
      const steps = expectedSteps(q).length;
      if (algo === "bubble_sort" && steps < 3) continue;
    }
    return q;
  }
  return { algo, data: [5, -1, 23, 8, 17, 4, 2, 6], ask: "all" };
}

function updateTraceCounts() {
  const s = saved.trace.score || { ok: 0, total: 0 };
  document.getElementById("traceScore").textContent = `${s.ok} / ${s.total}`;
  document.getElementById("count-trace").textContent = s.ok;
}

function mountTraceTab() {
  const chips = document.getElementById("traceAlgos");
  const keys = ["any", "binary_search", "bubble_sort", "selection_sort", "insertion_sort", "shell_sort"];
  chips.innerHTML = keys.map((k) => `<button class="mode" type="button" data-algo="${k}">${k === "any" ? "Any" : ALGOS[k].label}</button>`).join("");
  const paintChips = () => chips.querySelectorAll(".mode").forEach((b) => b.setAttribute("aria-pressed", b.dataset.algo === (saved.trace.algoSel || "any")));
  chips.addEventListener("click", (e) => { const b = e.target.closest(".mode"); if (!b) return; saved.trace.algoSel = b.dataset.algo; persist(); paintChips(); });
  paintChips();
  document.getElementById("traceNew").addEventListener("click", () => newTraceQuestion(true));
  const list = document.getElementById("traceList");
  list.innerHTML = TRACE_PRESETS.map((p) => `<button class="titem" type="button" data-id="${p.id}"><span class="dot" aria-hidden="true"></span><span class="t">${esc(p.title)}</span></button>`).join("");
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".titem"); if (!b) return;
    const p = TRACE_PRESETS.find((x) => x.id === b.dataset.id);
    saved.trace.cur = { preset: p.id, q: p.q, steps: null, graded: null, counted: false }; persist();
    renderTrace(true);
  });
  updateTraceCounts();
  if (saved.trace.cur) renderTrace(false); else newTraceQuestion(false);
}
function paintTraceList() {
  const done = saved.trace.presetDone || {};
  document.querySelectorAll("#traceList .titem").forEach((b) => {
    b.classList.remove("correct", "incorrect");
    if (done[b.dataset.id]) b.classList.add(done[b.dataset.id]);
    b.setAttribute("aria-current", !!(saved.trace.cur && saved.trace.cur.preset === b.dataset.id));
  });
}
function newTraceQuestion(scroll) {
  const sel = saved.trace.algoSel || "any";
  const pool = ["binary_search", "bubble_sort", "selection_sort", "insertion_sort", "shell_sort"];
  const r = Math.random;
  const algo = sel === "any" ? pool[Math.floor(r() * pool.length)] : sel;
  saved.trace.cur = { q: genTrace(algo, newSeed()), steps: null, graded: null, counted: false };
  persist();
  renderTrace(scroll);
}

function renderTrace(scroll) {
  const cur = saved.trace.cur, q = cur.q, A = ALGOS[q.algo];
  const main = document.getElementById("traceMain");
  const preset = cur.preset ? TRACE_PRESETS.find((p) => p.id === cur.preset) : null;
  const askTxt = Array.isArray(q.ask) ? `Show the array only after the ${q.ask.map(ord).join(" and after the ")} iteration of the outer loop.` : INSTR[q.algo];
  const call = q.algo === "linear_search"
    ? `The function is called with the array <code>{${q.data.join(", ")}}</code> and the key <code>${q.target}</code>.`
    : q.algo === "binary_search"
    ? `The function is called with the sorted array <code>{${q.data.join(", ")}}</code> and the key <code>${q.target}</code>.`
    : `The function is called on the array <code>{${q.data.join(", ")}}</code>.`;
  const isSort = !/search/.test(q.algo);
  main.innerHTML = `
  <section class="que">
    <div class="info">
      <h3>${preset ? esc(preset.title) : "Question"}: <b>${esc(A.label)}</b></h3>
      <div class="state">Not complete</div>
      <div class="grade">${A.lab}</div>
    </div>
    <div class="content">
      <div class="formulation">${preset && preset.students ? `<p>Consider the optimized <code>bubble_sort()</code> from Lab 04:</p><pre><code>${esc(ALGOS.bubble_sort.code)}</code></pre>
<p>The <code>Student</code> struct from Lab 04 overloads its comparison operators:</p><pre><code>${esc(STUDENT_SNIPPET)}</code></pre>
<p>The following code is executed:</p><pre><code>${esc(STUDENT_CALL)}</code></pre>
<p>The array below shows the gpa of each student. Show the gpa values after each iteration of the outer loop that makes at least one swap. Drag a cell onto another to swap them, or type the values.</p><div class="prompt"><span>Answer:</span></div></div>` : `
        <p>${q.algo === "selection_sort_max" ? "The following function changes <code>selection_sort()</code> from Lab 05 so that it selects the largest remaining element:" : `Consider ${q.algo === "bubble_sort" ? "the optimized " : ""}<code>${q.algo.replace("_swaps", "_sort").replace("_max", "")}()</code> from ${A.lab}:`}</p>
        <pre><code>${esc(A.code)}</code></pre>
        <p>${call}</p>
        <p>${esc(askTxt)}${isSort ? " Drag a cell onto another to swap them, or type the values." : ""}</p>
        <div class="prompt"><span>Answer:</span></div>
      </div>`}
      <div class="answer"></div>
      <div class="actions">
        <button class="btn primary check" type="button">Check</button>
        <button class="btn ghost reveal" type="button">Show answer</button>
        ${preset ? "" : '<button class="btn ghost again" type="button">New question</button>'}
      </div>
      <div class="outcome" hidden></div>
    </div>
  </section>`;
  const sec = $(".que", main);
  const again = $(".again", sec); if (again) again.addEventListener("click", () => newTraceQuestion(true));
  mountTrace(sec, cur);
  paintTraceList();
  if (scroll) sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
const ord = (k) => k + (k % 10 === 1 && k !== 11 ? "st" : k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th");

function mountTrace(sec, cur) {
  const q = cur.q, host = $(".answer", sec), out = $(".outcome", sec), stateEl = $(".state", sec);
  const isSort = !/search/.test(q.algo);
  const ptrs = q.algo === "binary_search" ? ["low", "mid", "high"] : q.algo === "linear_search" ? ["i"] : [];
  const fixed = Array.isArray(q.ask);
  const blank = () => isSort ? { arr: q.data.slice() } : Object.fromEntries(ptrs.map((p) => [p, null]));
  let steps = Array.isArray(cur.steps) ? cur.steps : (fixed ? q.ask.map(blank) : []);
  let undo = [], redo = [], marks = null, selected = null, revealed = false;

  const help = isSort
    ? "Click “Add iteration” to add a row (it starts as a copy of the row above). Drag a cell onto another cell to swap the two values, or click a cell and type a value."
    : q.algo === "linear_search" ? "Click “Add iteration” for each comparison. Drag the i marker onto a cell (or click it, then click a cell). Drop it back on the tray to remove it."
    : "Click “Add iteration” for each value of mid. Drag the low, mid and high markers onto a cell (or click a marker, then click a cell). Drop a marker back on the tray to remove it. With a marker focused, use Left/Right arrows to move it, Enter to confirm, Escape to cancel, or Delete to remove it.";
  host.innerHTML = `<div class="trace">
    <div class="t-toolbar" role="toolbar" aria-label="Trace tools">
      <div class="t-group">
        ${fixed ? "" : `<button class="tool add" type="button">${ICON.plus}<span>Add iteration</span></button>`}
        <button class="tool undo" type="button" disabled>${ICON.undo}<span>Undo</span></button>
        <button class="tool redo" type="button" disabled>${ICON.redo}<span>Redo</span></button>
      </div>
      <div class="t-group"><button class="tool helpbtn" type="button" aria-expanded="false">${ICON.help}<span>Help</span></button></div>
    </div>
    <p class="t-help" hidden>${esc(help)}</p>
    <div class="t-body"></div>
  </div>`;
  const body = $(".t-body", host);

  function commit(mutator) {
    if (revealed) return;
    undo.push(JSON.stringify(steps)); if (undo.length > 100) undo.shift(); redo = [];
    mutator(); changed();
  }
  function changed() {
    cur.steps = steps; marks = null; persist(); out.hidden = true;
    setStateBadge(stateEl, "answered"); render();
  }
  const label = (i) => fixed ? `After iteration ${q.ask[i]}` : `Iteration ${i + 1}`;
  function chip(si, p) {
    const sel = selected && selected.step === si && selected.ptr === p;
    return `<button class="chip ${p}${sel ? " selected" : ""}" type="button" data-step="${si}" data-ptr="${p}" aria-pressed="${sel}" ${revealed ? "disabled" : ""}>${p}</button>`;
  }
  function render() {
    let h = `<div class="step initial"><div class="stephead"><span class="steplabel">Initial</span></div><div class="cols">` +
      q.data.map((v, i) => `<div class="col"><span class="idx">${i}</span><span class="cell locked">${v}</span></div>`).join("") + `</div>` +
      (q.target !== undefined ? `<div class="target">Key: <b>${q.target}</b></div>` : "") + `</div>`;
    if (!steps.length) h += `<div class="t-empty">No iterations yet. Click <b>Add iteration</b> to add the first one.</div>`;
    steps.forEach((s, si) => {
      const m = marks ? marks[si] : null;
      h += `<div class="step ${m === true ? "ok" : m === false ? "bad" : ""}" data-step="${si}">
        <div class="stephead"><span class="steplabel">${label(si)}${m === true ? '<span class="tag ok">correct</span>' : m === false ? '<span class="tag bad">wrong</span>' : ""}</span>
          ${revealed ? "" : `<div class="stepactions">
            <button class="iconbtn copyprev" type="button" title="Make this step the same as the one before it">${ICON.copy}<span>Copy previous</span></button>
            ${fixed ? "" : `<button class="iconbtn remove" type="button" title="Remove ${label(si)}">${ICON.trash}<span>Remove</span></button>`}
          </div>`}</div><div class="cols">`;
      if (isSort) {
        h += s.arr.map((v, i) => `<div class="col"><span class="idx">${i}</span><span class="cell sortcell" data-i="${i}"><input inputmode="numeric" value="${esc(v)}" aria-label="${label(si)}, position ${i}" ${revealed ? "readonly" : ""}></span></div>`).join("") + `</div>`;
      } else {
        h += q.data.map((v, i) => `<div class="col ${selected && selected.step === si ? "target-ready" : ""}" data-i="${i}"><span class="idx">${i}</span><span class="cell locked">${v}</span><div class="lane">${ptrs.filter((p) => s[p] === i).map((p) => chip(si, p)).join("")}</div></div>`).join("") + `</div>`;
        const loose = ptrs.filter((p) => s[p] === null || s[p] === undefined);
        h += `<div class="tray" data-tray="1">${loose.length ? loose.map((p) => chip(si, p)).join("") : "<span>Drop a marker here to remove it</span>"}</div>`;
      }
      h += `</div>`;
    });
    body.innerHTML = h;
    $(".undo", host).disabled = !undo.length || revealed; $(".redo", host).disabled = !redo.length || revealed;
    const add = $(".add", host); if (add) add.disabled = revealed;
  }

  const addBtn = $(".add", host);
  if (addBtn) addBtn.addEventListener("click", () => commit(() => steps.push(isSort && steps.length ? { arr: steps[steps.length - 1].arr.slice() } : blank())));
  $(".undo", host).addEventListener("click", () => { if (!undo.length) return; redo.push(JSON.stringify(steps)); steps = JSON.parse(undo.pop()); changed(); });
  $(".redo", host).addEventListener("click", () => { if (!redo.length) return; undo.push(JSON.stringify(steps)); steps = JSON.parse(redo.pop()); changed(); });
  $(".helpbtn", host).addEventListener("click", (e) => { const p = $(".t-help", host); p.hidden = !p.hidden; e.currentTarget.setAttribute("aria-expanded", !p.hidden); });

  let suppressClick = false;
  body.addEventListener("click", (e) => {
    const stepEl = e.target.closest(".step[data-step]"); if (!stepEl || revealed) return;
    const si = +stepEl.dataset.step;
    if (e.target.closest(".copyprev")) { commit(() => { steps[si] = si === 0 ? blank() : JSON.parse(JSON.stringify(steps[si - 1])); }); return; }
    if (e.target.closest(".remove")) { commit(() => steps.splice(si, 1)); selected = null; return; }
    if (isSort) return;
    const c = e.target.closest(".chip");
    if (c) {
      if (suppressClick) return;
      selected = (selected && selected.step === si && selected.ptr === c.dataset.ptr) ? null : { step: si, ptr: c.dataset.ptr, index: steps[si][c.dataset.ptr] ?? 0 };
      render(); const again = body.querySelector(`.chip[data-step="${si}"][data-ptr="${c.dataset.ptr}"]`); if (again) again.focus();
      return;
    }
    if (selected && selected.step === si) {
      const col = e.target.closest(".col[data-i]"), tray = e.target.closest(".tray");
      if (col) { const p = selected.ptr; selected = null; commit(() => { steps[si][p] = +col.dataset.i; }); }
      else if (tray) { const p = selected.ptr; selected = null; commit(() => { steps[si][p] = null; }); }
    }
  });
  body.addEventListener("keydown", (e) => {
    const c = e.target.closest(".chip");
    if (!c || isSort || revealed) return;
    const si = +c.dataset.step, p = c.dataset.ptr;
    const focusMarker = () => { const el = body.querySelector(`.chip[data-step="${si}"][data-ptr="${p}"]`); if (el) el.focus(); };
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (!selected || selected.step !== si || selected.ptr !== p)
        selected = { step: si, ptr: p, index: steps[si][p] ?? (e.key === "ArrowRight" ? -1 : q.data.length) };
      selected.index = Math.max(0, Math.min(q.data.length - 1, selected.index + (e.key === "ArrowRight" ? 1 : -1)));
      render();
      body.querySelector(`.step[data-step="${si}"] .col[data-i="${selected.index}"]`).classList.add("drop-hover");
      focusMarker();
    } else if (e.key === "Enter" && selected && selected.step === si && selected.ptr === p) {
      e.preventDefault(); const index = selected.index; selected = null;
      commit(() => { steps[si][p] = index; }); focusMarker();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault(); selected = null; commit(() => { steps[si][p] = null; }); focusMarker();
    } else if (e.key === "Escape" && selected) {
      e.preventDefault(); selected = null; render(); focusMarker();
    }
  });
  body.addEventListener("change", (e) => {
    const inp = e.target.closest(".sortcell input"); if (!inp || revealed) return;
    const si = +inp.closest(".step").dataset.step, i = +inp.closest(".cell").dataset.i;
    const v = inp.value.trim(); const num = Number(v);
    // update the model without re-rendering, so Tab moves on to the next cell normally
    undo.push(JSON.stringify(steps)); if (undo.length > 100) undo.shift(); redo = [];
    steps[si].arr[i] = v === "" ? "" : (Number.isFinite(num) ? num : v);
    cur.steps = steps; persist(); out.hidden = true; setStateBadge(stateEl, "answered");
    if (marks) {
      marks = null;
      body.querySelectorAll(".step.ok, .step.bad").forEach((el) => el.classList.remove("ok", "bad"));
      body.querySelectorAll(".steplabel .tag").forEach((t) => t.remove());
    }
    $(".undo", host).disabled = false; $(".redo", host).disabled = true;
  });

  let drag = null;
  body.addEventListener("pointerdown", (e) => {
    if (revealed) return;
    const c = e.target.closest(".chip"), sc = e.target.closest(".sortcell");
    if ((!c && !sc) || e.button !== 0) return;
    const stepEl = e.target.closest(".step[data-step]"); if (!stepEl) return;
    drag = { el: c || sc, kind: c ? "chip" : "cell", step: +stepEl.dataset.step, ptr: c ? c.dataset.ptr : null, i: sc ? +sc.dataset.i : null, x: e.clientX, y: e.clientY, active: false, ghost: null, over: null };
  });
  const onMove = (e) => {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.active = true;
      const g = drag.el.cloneNode(true); g.classList.add("drag-ghost"); g.classList.remove("selected");
      if (drag.kind === "cell") { const inp = drag.el.querySelector("input"); g.innerHTML = esc(inp ? inp.value : ""); if (inp) inp.blur(); }
      document.body.appendChild(g); drag.ghost = g;
    }
    e.preventDefault();
    drag.ghost.style.left = e.clientX + "px"; drag.ghost.style.top = e.clientY + "px";
    const under = document.elementFromPoint(e.clientX, e.clientY);
    let over = null;
    if (under) {
      const st = under.closest(`.step[data-step="${drag.step}"]`);
      if (st && host.contains(st)) over = drag.kind === "chip" ? (under.closest(".col[data-i]") || under.closest(".tray")) : under.closest(".sortcell");
    }
    if (over !== drag.over) { if (drag.over) drag.over.classList.remove("drop-hover"); if (over) over.classList.add("drop-hover"); drag.over = over; }
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.active) return;
    d.ghost.remove(); if (d.over) d.over.classList.remove("drop-hover");
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    if (!d.over) return;
    if (d.kind === "chip") {
      const to = d.over.classList.contains("tray") ? null : +d.over.dataset.i;
      selected = null;
      commit(() => { steps[d.step][d.ptr] = to; });
    } else {
      const j = +d.over.dataset.i; if (j === d.i) return;
      commit(() => { const a = steps[d.step].arr; [a[d.i], a[j]] = [a[j], a[d.i]]; });
    }
  };
  const onCancel = () => { if (drag && drag.ghost) drag.ghost.remove(); if (drag && drag.over) drag.over.classList.remove("drop-hover"); drag = null; };
  // listeners live on window; drop the previous question's before adding these
  if (window.__traceDragOff) window.__traceDragOff();
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.__traceDragOff = () => {
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
  };

  function grade(silent) {
    const exp = expectedSteps(q);
    const same = (a, b) => isSort ? a.arr.length === b.arr.length && a.arr.every((v, i) => String(v).trim() !== "" && Number(v) === b.arr[i]) : ptrs.every((p) => a[p] === b[p]);
    marks = steps.map((s, i) => i < exp.length && same(s, exp[i]));
    const right = marks.filter(Boolean).length;
    const all = right === exp.length && steps.length === exp.length;
    const lines = [];
    if (!all) {
      if (steps.length < exp.length) lines.push(`Some iterations are missing: you have ${steps.length}.`);
      else if (steps.length > exp.length) lines.push(`There are too many iterations: you have ${steps.length}.`);
      const wrong = marks.map((m, i) => m ? null : label(i)).filter(Boolean);
      if (wrong.length) lines.push(`Not correct: ${wrong.join(", ")}.`);
      if (!isSort && steps.some((s) => ptrs.some((p) => s[p] === null || s[p] === undefined))) lines.push("Some markers are still on the tray.");
    }
    out.hidden = false;
    out.innerHTML = verdictHtml(all, all ? "Correct trace!" : "Not quite right") + (lines.length ? `<div>${lines.map(esc).join("<br>")}</div>` : "") +
      (cur.revealed ? '<div class="marks">You viewed the answer for this question, so it is not counted as solved. Press <b>New question</b> for a fresh one.</div>' : "");
    render();
    setStateBadge(stateEl, cur.revealed ? "seen" : all ? "correct" : "incorrect");
    cur.graded = all ? 1 : 0;
    if (!silent) {
      if (!cur.counted) {
        cur.counted = true;
        const s = saved.trace.score = saved.trace.score || { ok: 0, total: 0 };
        s.total++; if (all) s.ok++;
      }
      if (cur.preset && !cur.revealed) { saved.trace.presetDone = saved.trace.presetDone || {}; if (saved.trace.presetDone[cur.preset] !== "correct") saved.trace.presetDone[cur.preset] = all ? "correct" : "incorrect"; }
      persist(); updateTraceCounts(); paintTraceList();
    }
  }
  $(".check", sec).addEventListener("click", () => grade(false));
  $(".reveal", sec).addEventListener("click", (e) => {
    if (!revealed) {
      if (!cur.counted) { cur.counted = true; const s = saved.trace.score = saved.trace.score || { ok: 0, total: 0 }; s.total++; persist(); updateTraceCounts(); }
      revealed = true; cur.revealed = true; cur.mine = steps; steps = expectedSteps(q); marks = null; selected = null;
      $(".check", sec).disabled = true; setStateBadge(stateEl, "seen"); persist();
      out.hidden = false; out.innerHTML = `<div class="marks">This is the correct trace. Press <b>Hide answer</b> to go back to yours.</div>`;
      e.currentTarget.textContent = "Hide answer";
    } else {
      revealed = false; steps = cur.mine || steps; out.hidden = true; e.currentTarget.textContent = "Show answer";
      $(".check", sec).disabled = false;
    }
    render();
  });
  render();
  if (typeof cur.graded === "number") grade(true);
  else if (cur.revealed) setStateBadge(stateEl, "seen");
  else if (steps.length) setStateBadge(stateEl, "answered");
}

/* ====================================================================== STACKS & QUEUES */
const DG = window.DrawGen;
function updateDrawCounts() {
  const s = saved.draw.score || { ok: 0, total: 0 };
  document.getElementById("drawScore").textContent = `${s.ok} / ${s.total}`;
  document.getElementById("count-draw").textContent = s.ok;
}
function mountDrawTab() {
  const chips = document.getElementById("drawKinds");
  chips.innerHTML = ["any"].concat(DG.KINDS).map((k) => `<button class="mode" type="button" data-kind="${k}">${k === "any" ? "Any" : esc(DG.KIND_LABEL[k])}</button>`).join("");
  const paint = () => chips.querySelectorAll(".mode").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === (saved.draw.kindSel || "any")));
  chips.addEventListener("click", (e) => { const b = e.target.closest(".mode"); if (!b) return; saved.draw.kindSel = b.dataset.kind; persist(); paint(); });
  paint();
  document.getElementById("drawNew").addEventListener("click", () => newDrawQuestion(true));
  const list = document.getElementById("drawList");
  list.innerHTML = DG.PRESETS.map((p, i) => `<button class="titem" type="button" data-i="${i}"><span class="dot" aria-hidden="true"></span><span class="t">${esc(p.title)}</span></button>`).join("");
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".titem"); if (!b) return;
    saved.draw.cur = { preset: +b.dataset.i, items: [], graded: null, counted: false }; persist();
    renderDraw(true);
  });
  updateDrawCounts();
  if (saved.draw.cur) renderDraw(false); else newDrawQuestion(false);
}
function paintDrawList() {
  const done = saved.draw.presetDone || {};
  document.querySelectorAll("#drawList .titem").forEach((b) => {
    b.classList.remove("correct", "incorrect");
    if (done[b.dataset.i]) b.classList.add(done[b.dataset.i]);
    b.setAttribute("aria-current", !!(saved.draw.cur && saved.draw.cur.preset === +b.dataset.i));
  });
}
function newDrawQuestion(scroll) {
  const sel = saved.draw.kindSel || "any";
  saved.draw.cur = { seed: newSeed(), kind: sel === "any" ? null : sel, items: [], graded: null, counted: false };
  persist(); renderDraw(scroll);
}
function drawQuestion(cur) {
  if (typeof cur.preset === "number") return DG.PRESETS[cur.preset].make();
  return DG.generate(cur.seed, cur.kind || undefined);
}
function fmtState(kind, items) {
  if (!items.length) return "(empty)";
  return kind === "stack" ? `bottom → ${items.join(", ")} ← top` : `head → ${items.join(", ")} ← tail`;
}

function renderDraw(scroll) {
  const cur = saved.draw.cur;
  let Q;
  try { Q = drawQuestion(cur); } catch (e) { saved.draw.cur = null; newDrawQuestion(false); return; }
  const isStack = Q.structure === "stack";
  const main = document.getElementById("drawMain");
  const preset = typeof cur.preset === "number" ? DG.PRESETS[cur.preset] : null;
  const intro = isStack
    ? "Consider the template <code>Stack&lt;Data&gt;</code> class from Lab 03, implemented on a singly linked list (<code>top</code> and <code>length</code>). The initializer list constructor calls <code>push()</code> for each value in order, so the <strong>last</strong> value of the list ends up on top."
    : "Consider the template <code>Queue&lt;Data&gt;</code> class from Lab 03, implemented on a singly linked list (<code>head</code>, <code>tail</code> and <code>length</code>). <code>enqueue()</code> adds at the tail, <code>dequeue()</code> removes from the head, and the initializer list constructor calls <code>enqueue()</code> for each value in order.";
  const both = /Stack<int>/.test(Q.code) && /Queue<int>/.test(Q.code);
  const extra = both ? (isStack ? " The <code>Queue&lt;Data&gt;</code> class from Lab 03 is also used: <code>enqueue()</code> adds at the tail and <code>dequeue()</code> removes from the head." : " The <code>Stack&lt;Data&gt;</code> class from Lab 03 is also used: <code>push()</code> and <code>pop()</code> work on the top.") : "";
  const semantics = /std::move/.test(Q.code) ? " Its move constructor and move assignment transfer the nodes and leave the source empty." : /copy/.test(Q.code) ? " Its copy constructor and copy assignment make a deep copy with the same order of elements." : "";
  const several = !Q.instructions && (Q.code.match(/(Stack|Queue)<int> /g) || []).length > 1;
  main.innerHTML = `
  <section class="que">
    <div class="info">
      <h3>${preset ? esc(preset.title) : "Question"}: <b>${esc(DG.KIND_LABEL[Q.kind] || "")}</b></h3>
      <div class="state">Not complete</div>
      <div class="grade">Lab 03</div>
    </div>
    <div class="content">
      <div class="formulation">
        ${Q.instructions ? `<p>Starting from an <strong>empty ${isStack ? "stack" : "queue"}</strong>, the following operations are performed in this order${Q.texts.includes("Reverse") ? ` (<em>Reverse</em> reverses the whole ${isStack ? "stack" : "queue"})` : ""}:</p>
        <ol class="ops">${Q.texts.slice(1).map((t) => `<li><code>${esc(t)}</code></li>`).join("")}</ol>` : `<p>${intro}${extra}${semantics}</p>
        <p>The following code is executed:</p>
        <pre><code>${esc(Q.code)}</code></pre>`}
        <p>${isStack
          ? `Use <strong>Push</strong> to build the <strong>final state of stack <code>${Q.ask}</code></strong>${several ? ` (only <code>${Q.ask}</code>)` : ""}, so that the element on top of the drawing is the top of the stack.`
          : `Use <strong>Enqueue</strong> to build the <strong>final state of queue <code>${Q.ask}</code></strong>${several ? ` (only <code>${Q.ask}</code>)` : ""}, from the head (front) to the tail (back).`}</p>
        <div class="prompt"><span>Answer:</span></div>
      </div>
      <div class="answer"></div>
      <div class="actions">
        <button class="btn primary check" type="button">Check</button>
        <button class="btn ghost reveal" type="button">Show answer</button>
        ${preset ? "" : '<button class="btn ghost again" type="button">New question</button>'}
      </div>
      <div class="outcome" hidden></div>
    </div>
  </section>`;
  const sec = $(".que", main);
  const again = $(".again", sec); if (again) again.addEventListener("click", () => newDrawQuestion(true));
  mountDraw(sec, cur, Q);
  paintDrawList();
  if (scroll) sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function mountDraw(sec, cur, Q) {
  const isStack = Q.structure === "stack";
  const host = $(".answer", sec), out = $(".outcome", sec), stateEl = $(".state", sec);
  let items = Array.isArray(cur.items) ? cur.items.slice() : [];
  let sel = null, undo = [], redo = [], marks = null;
  const addLabel = isStack ? "Push" : "Enqueue", remLabel = isStack ? "Pop" : "Dequeue";
  host.innerHTML = `<div class="ds">
    <div class="ds-toolbar" role="toolbar" aria-label="${isStack ? "Stack" : "Queue"} editor">
      <label class="sr" for="dsval" style="position:absolute;left:-9999px">Value</label>
      <input id="dsval" class="val" inputmode="numeric" placeholder="value" aria-label="Value to ${addLabel.toLowerCase()}">
      <button class="tool add" type="button">${ICON.plus}<span>${addLabel}</span></button>
      <button class="tool rem" type="button">${ICON.minus}<span>${remLabel}</span></button>
      <span class="sep" aria-hidden="true"></span>
      <button class="tool mv1" type="button" title="Move the selected element ${isStack ? "up" : "left"}">${isStack ? ICON.up : ICON.left}<span>${isStack ? "Up" : "Left"}</span></button>
      <button class="tool mv2" type="button" title="Move the selected element ${isStack ? "down" : "right"}">${isStack ? ICON.down : ICON.right}<span>${isStack ? "Down" : "Right"}</span></button>
      <button class="tool del" type="button">${ICON.trash}<span>Delete</span></button>
      <span class="sep" aria-hidden="true"></span>
      <button class="tool undo" type="button">${ICON.undo}<span>Undo</span></button>
      <button class="tool redo" type="button">${ICON.redo}<span>Redo</span></button>
      <button class="tool clear" type="button">Clear</button>
    </div>
    <div class="ds-body"></div>
  </div>`;
  const body = $(".ds-body", host), val = $(".val", host);

  function commit(fn) { undo.push(JSON.stringify(items)); redo = []; fn(); changed(); }
  function changed() {
    cur.items = items.slice(); marks = null; out.hidden = true; persist();
    setStateBadge(stateEl, items.length ? "answered" : ""); render();
  }
  function render() {
    // stack: draw top first (items[last] at the top); queue: head at the left
    const order = isStack ? items.map((v, i) => i).reverse() : items.map((v, i) => i);
    const cells = order.map((i, k) => {
      const m = marks ? marks[i] : null;
      const pos = isStack && i === 0 && items.length > 1 ? "bottom" : "";
      return `<div class="dsitem${m === true ? " ok" : m === false ? " bad" : ""}" role="option" tabindex="${sel === i || (sel === null && k === 0) ? 0 : -1}" data-i="${i}" aria-selected="${sel === i}" aria-label="${isStack ? "position " + (items.length - i) + " from the top" : "position " + (i + 1) + " from the head"}: ${esc(items[i])}">${pos ? `<span class="pos">${pos}</span>` : ""}${esc(items[i])}</div>`;
    }).join("");
    if (!items.length) body.innerHTML = `<div class="ds-empty">The ${isStack ? "stack" : "queue"} is empty.<br>Type a value and press <b>${addLabel}</b> (or Enter).</div>`;
    else if (isStack) body.innerHTML = `<div class="stackview"><div class="cap">top</div><div class="box" role="listbox" aria-label="Stack, top first">${cells}</div></div>`;
    else body.innerHTML = `<div class="queueview"><span class="cap">head →</span><div class="box" role="listbox" aria-label="Queue, head first">${cells}</div><span class="cap">← tail</span></div>`;
    $(".undo", host).disabled = !undo.length; $(".redo", host).disabled = !redo.length;
    $(".rem", host).disabled = !items.length; $(".clear", host).disabled = !items.length;
    $(".del", host).disabled = $(".mv1", host).disabled = $(".mv2", host).disabled = sel === null;
  }
  function addValue() {
    const v = val.value.trim();
    if (v === "" || !Number.isFinite(Number(v))) { val.focus(); val.select(); return; }
    commit(() => { items.push(Number(v)); sel = null; });
    val.value = ""; val.focus();
  }
  $(".add", host).addEventListener("click", addValue);
  val.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addValue(); } });
  $(".rem", host).addEventListener("click", () => { if (!items.length) return; commit(() => { if (isStack) items.pop(); else items.shift(); sel = null; }); });
  $(".del", host).addEventListener("click", () => { if (sel === null) return; commit(() => { items.splice(sel, 1); sel = null; }); });
  const move = (towardTopOrLeft) => {
    if (sel === null) return;
    // stack: "up" means toward the top = higher index; queue: "left" means toward the head = lower index
    const to = isStack ? (towardTopOrLeft ? sel + 1 : sel - 1) : (towardTopOrLeft ? sel - 1 : sel + 1);
    if (to < 0 || to >= items.length) return;
    commit(() => { [items[sel], items[to]] = [items[to], items[sel]]; sel = to; });
    const el = body.querySelector(`.dsitem[data-i="${sel}"]`); if (el) el.focus();
  };
  $(".mv1", host).addEventListener("click", () => move(true));
  $(".mv2", host).addEventListener("click", () => move(false));
  $(".undo", host).addEventListener("click", () => { if (!undo.length) return; redo.push(JSON.stringify(items)); items = JSON.parse(undo.pop()); sel = null; changed(); });
  $(".redo", host).addEventListener("click", () => { if (!redo.length) return; undo.push(JSON.stringify(items)); items = JSON.parse(redo.pop()); sel = null; changed(); });
  $(".clear", host).addEventListener("click", () => commit(() => { items = []; sel = null; }));
  body.addEventListener("click", (e) => {
    const it = e.target.closest(".dsitem"); if (!it) { sel = null; render(); return; }
    const i = +it.dataset.i; sel = sel === i ? null : i; render();
    const el = body.querySelector(`.dsitem[data-i="${i}"]`); if (el) el.focus();
  });
  body.addEventListener("keydown", (e) => {
    const it = e.target.closest(".dsitem"); if (!it) return;
    const i = +it.dataset.i;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); sel = i; $(".del", host).click(); }
    else if (e.key === "Escape") { sel = null; render(); }
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); sel = sel === i ? null : i; render(); const el = body.querySelector(`.dsitem[data-i="${i}"]`); if (el) el.focus(); }
    else if ((isStack && (e.key === "ArrowUp" || e.key === "ArrowDown")) || (!isStack && (e.key === "ArrowLeft" || e.key === "ArrowRight"))) {
      e.preventDefault();
      sel = i;
      move(e.key === "ArrowUp" || e.key === "ArrowLeft");
    }
  });

  function grade(silent) {
    const exp = Q.answer;
    marks = items.map((v, i) => i < exp.length && v === exp[i]);
    const all = items.length === exp.length && marks.every(Boolean);
    const lines = [];
    if (!all) {
      if (items.length < exp.length) lines.push(`Some elements are missing: you have ${items.length}.`);
      else if (items.length > exp.length) lines.push(`There are too many elements: you have ${items.length}.`);
      else lines.push("The marked elements are not right.");
    }
    out.hidden = false;
    out.innerHTML = verdictHtml(all, all ? "Correct final state!" : "Not quite right") + (lines.length ? `<div>${lines.map(esc).join("<br>")}</div>` : "") +
      (cur.revealed ? '<div class="marks">You viewed the answer for this question, so it is not counted as solved. Press <b>New question</b> for a fresh one.</div>' : "");
    render();
    setStateBadge(stateEl, cur.revealed ? "seen" : all ? "correct" : "incorrect");
    cur.graded = all ? 1 : 0;
    if (!silent) {
      if (!cur.counted) { cur.counted = true; const s = saved.draw.score = saved.draw.score || { ok: 0, total: 0 }; s.total++; if (all) s.ok++; }
      if (typeof cur.preset === "number" && !cur.revealed) { saved.draw.presetDone = saved.draw.presetDone || {}; if (saved.draw.presetDone[cur.preset] !== "correct") saved.draw.presetDone[cur.preset] = all ? "correct" : "incorrect"; }
      persist(); updateDrawCounts(); paintDrawList();
    }
  }
  $(".check", sec).addEventListener("click", () => grade(false));
  $(".reveal", sec).addEventListener("click", () => {
    if (!cur.counted) { cur.counted = true; const s = saved.draw.score = saved.draw.score || { ok: 0, total: 0 }; s.total++; persist(); updateDrawCounts(); }
    cur.revealed = true; persist(); setStateBadge(stateEl, "seen");
    const names = Object.keys(Q.snaps[Q.snaps.length - 1]);
    const rows = (Q.instructions ? Q.texts.map((t, i) => i === 0 ? `(empty ${Q.structure})` : t) : Q.lines).map((line, i) => `<tr><td><pre>${esc(line)}</pre></td>${names.map((n) => `<td class="st">${Q.snaps[i][n] ? esc(fmtState(Q.snaps[i][n].kind, Q.snaps[i][n].items)) : ""}</td>`).join("")}</tr>`).join("");
    out.hidden = false;
    out.innerHTML = `<div class="verdict ok">${ICON.ok}<span>Answer: ${esc(fmtState(Q.structure, Q.answer))}</span></div>
      <div class="results"><table class="steps-table"><thead><tr><th>Statement</th>${names.map((n) => `<th>${esc(n)} after it</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
  });
  render();
  if (typeof cur.graded === "number" && items.length) grade(true);
  else if (cur.revealed) setStateBadge(stateEl, "seen");
  else if (items.length) setStateBadge(stateEl, "answered");
}

/* ====================================================================== boot */
document.getElementById("resetAll").addEventListener("click", () => {
  if (!confirm("Clear all your answers and scores on this page?")) return;
  saved = { code: {}, trace: {}, draw: {}, tab: saved.tab };
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
  location.reload();
});
updateCodeCounts(); updateTraceCounts(); updateDrawCounts();
showTab(["code", "trace", "draw"].includes(saved.tab) ? saved.tab : "code");
})();
