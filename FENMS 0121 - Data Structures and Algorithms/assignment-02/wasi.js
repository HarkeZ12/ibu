// Minimal WASI preview1 runtime for the compiled test programs: args, stdout/stderr, clocks, exit.
export function runWasm(module, args = ["main"]) {
  let mem;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const out = [], err = [];
  let outBytes = 0;
  const OUT_LIMIT = 200000;
  class Exit extends Error { constructor(c) { super("exit"); this.code = c; } }
  const view = () => new DataView(mem.buffer);
  const ENOSYS = 52, EBADF = 8;
  const argBytes = args.map((a) => enc.encode(a + "\0"));
  const w = {
    fd_write(fd, iovs, n, nwritten) {
      const v = view(); let total = 0, s = "";
      for (let i = 0; i < n; i++) {
        const p = v.getUint32(iovs + i * 8, true), l = v.getUint32(iovs + i * 8 + 4, true);
        s += dec.decode(new Uint8Array(mem.buffer, p, l)); total += l;
      }
      if (fd === 1) { if (outBytes < OUT_LIMIT) out.push(s); outBytes += s.length; }
      else if (fd === 2) err.push(s);
      else return EBADF;
      v.setUint32(nwritten, total, true); return 0;
    },
    fd_read() { return ENOSYS; }, fd_close() { return 0; }, fd_seek() { return ENOSYS; },
    fd_fdstat_get(fd, p) {
      if (fd > 2) return EBADF;
      const v = view(); v.setUint8(p, 2); v.setUint16(p + 2, 0, true); v.setBigUint64(p + 8, 0n, true); v.setBigUint64(p + 16, 0n, true); return 0;
    },
    fd_fdstat_set_flags() { return 0; }, fd_prestat_get() { return EBADF; }, fd_prestat_dir_name() { return EBADF; },
    fd_filestat_get() { return ENOSYS; }, path_open() { return ENOSYS; }, path_filestat_get() { return ENOSYS; },
    environ_sizes_get(c, s) { const v = view(); v.setUint32(c, 0, true); v.setUint32(s, 0, true); return 0; },
    environ_get() { return 0; },
    args_sizes_get(c, s) {
      const v = view(); v.setUint32(c, argBytes.length, true); v.setUint32(s, argBytes.reduce((a, b) => a + b.length, 0), true); return 0;
    },
    args_get(argv, buf) {
      const v = view(), m = new Uint8Array(mem.buffer); let p = buf;
      argBytes.forEach((b, i) => { v.setUint32(argv + i * 4, p, true); m.set(b, p); p += b.length; });
      return 0;
    },
    clock_time_get(id, prec, p) { view().setBigUint64(p, BigInt(Math.round(performance.now() * 1e6)), true); return 0; },
    clock_res_get(id, p) { view().setBigUint64(p, 1000n, true); return 0; },
    random_get(p, l) { crypto.getRandomValues(new Uint8Array(mem.buffer, p, l)); return 0; },
    proc_exit(c) { throw new Exit(c); },
    sched_yield() { return 0; }, poll_oneoff() { return ENOSYS; },
  };
  const imports = { wasi_snapshot_preview1: new Proxy(w, { get: (t, k) => t[k] || (() => ENOSYS) }) };
  const inst = new WebAssembly.Instance(module, imports);
  mem = inst.exports.memory;
  let code = 0, trap = null;
  try { inst.exports._start(); }
  catch (e) {
    if (e instanceof Exit) code = e.code;
    else { trap = String((e && e.message) || e); code = 134; }
  }
  return { code, trap, stdout: out.join("") + (outBytes >= OUT_LIMIT ? "\n…(output cut)" : ""), stderr: err.join("") };
}
