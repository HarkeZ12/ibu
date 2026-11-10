// Compiles C++ with Clang/LLD built for WebAssembly (YoWASP, loaded from a CDN) and runs each test
// in a fresh instance of the compiled program. Runs in a module worker so an endless loop in a
// student's code can be stopped by terminating the worker.
import { runWasm } from "./wasi.js";

const VERSION = "22.0.0-git20542-10";
const SOURCES = [
  `https://cdn.jsdelivr.net/npm/@yowasp/clang@${VERSION}/gen/bundle.js`,
  `https://unpkg.com/@yowasp/clang@${VERSION}/gen/bundle.js`,
];
let clangPromise = null;

function loadClang() {
  if (!clangPromise) {
    clangPromise = (async () => {
      let lastErr;
      for (const url of SOURCES) {
        try { return await import(url); } catch (e) { lastErr = e; }
      }
      clangPromise = null;
      throw lastErr;
    })();
  }
  return clangPromise;
}

const progress = (ev) => {
  self.postMessage({ type: "progress", done: ev.doneLength, total: ev.totalLength });
};

async function compile(source) {
  const { runClang } = await loadClang();
  let stderr = "";
  const dec = new TextDecoder();
  const opts = { stdout: null, stderr: (b) => { if (b) stderr += dec.decode(b, { stream: true }); }, fetchProgress: progress };
  const args = ["clang++", "-std=c++20", "-O0", "-fno-color-diagnostics", "-Wno-everything", "main.cpp", "-o", "main.wasm"];
  try {
    const files = await runClang(args, { "main.cpp": source }, opts);
    return { ok: true, wasm: files["main.wasm"], stderr };
  } catch (e) {
    if (e && typeof e.code === "number") return { ok: false, stderr: stderr || String(e.message || e) };
    throw e;
  }
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "warm") {
      await compile("int main() { return 0; }\n");
      self.postMessage({ type: "ready" });
      return;
    }
    if (m.type === "run") {
      const t0 = performance.now();
      const c = await compile(m.source);
      self.postMessage({ type: "compiled", id: m.id, ok: c.ok, stderr: c.stderr, ms: Math.round(performance.now() - t0) });
      if (!c.ok) return;
      const module = await WebAssembly.compile(c.wasm);
      for (let i = 0; i < m.tests; i++) {
        self.postMessage({ type: "test-start", id: m.id, i });
        const r = runWasm(module, ["main", String(i)]);
        self.postMessage({ type: "test", id: m.id, i, ...r });
      }
      self.postMessage({ type: "done", id: m.id });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: m.id, message: String((err && err.message) || err) });
  }
};
