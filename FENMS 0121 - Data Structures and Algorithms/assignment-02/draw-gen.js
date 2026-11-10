// Stack / queue "draw the final state" questions: a tiny builder that writes the C++ code and
// simulates the Lab 03 Stack and Queue at the same time. Used by the page and by .build/check_draw.mjs.
(function (root) {
  "use strict";

  // ---------- random helpers (seedable so a question can be restored) ----------
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const R = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  class Invalid extends Error {}

  // ---------- state ----------
  const clone = (st) => { const o = {}; for (const k in st) o[k] = { kind: st[k].kind, items: st[k].items.slice() }; return o; };
  function need(st, x) { if (!st[x]) throw new Invalid("no " + x); return st[x]; }
  function take(st, x) {
    const s = need(st, x);
    if (!s.items.length) throw new Invalid("empty");
    return s.kind === "stack" ? s.items.pop() : s.items.shift();
  }
  function front(st, x) {
    const s = need(st, x);
    if (!s.items.length) throw new Invalid("empty");
    return s.kind === "stack" ? s.items[s.items.length - 1] : s.items[0];
  }

  // ---------- expressions ----------
  const E = {
    lit: (v) => ({ code: String(v), ev: () => v, mut: false }),
    peek: (x) => ({ code: `${x}.peek()`, ev: (st) => front(st, x), mut: false }),
    size: (x) => ({ code: `${x}.size()`, ev: (st) => need(st, x).items.length, mut: false }),
    take: (x, kind) => ({ code: `${x}.${kind === "stack" ? "pop" : "dequeue"}()`, ev: (st) => take(st, x), mut: true }),
    bin: (e, op, k) => ({
      code: `${e.code} ${op} ${k}`, mut: e.mut,
      ev: (st) => { const v = e.ev(st); return op === "+" ? v + k : op === "-" ? v - k : v * k; },
    }),
  };

  // ---------- statements ----------
  const add = (kind) => (kind === "stack" ? "push" : "enqueue");
  const rem = (kind) => (kind === "stack" ? "pop" : "dequeue");
  const T = (kind) => (kind === "stack" ? "Stack<int>" : "Queue<int>");
  const S = {
    declEmpty: (kind, x) => ({ code: `${T(kind)} ${x};`, run: (st) => { st[x] = { kind, items: [] }; } }),
    declInit: (kind, x, vals) => ({ code: `${T(kind)} ${x} = {${vals.join(", ")}};`, run: (st) => { st[x] = { kind, items: vals.slice() }; } }),
    declCopy: (kind, x, src) => ({ code: `${T(kind)} ${x} = ${src}; // copy constructor (deep copy)`, run: (st) => { st[x] = { kind, items: need(st, src).items.slice() }; } }),
    declMove: (kind, x, src) => ({ code: `${T(kind)} ${x} = std::move(${src}); // move constructor`, run: (st) => { st[x] = { kind, items: need(st, src).items }; st[src].items = []; } }),
    assignCopy: (x, src) => ({ code: `${x} = ${src}; // copy assignment`, run: (st) => { need(st, x).items = need(st, src).items.slice(); } }),
    assignMove: (x, src) => ({ code: `${x} = std::move(${src}); // move assignment`, run: (st) => { need(st, x).items = need(st, src).items; st[src].items = []; } }),
    add: (x, kind, e) => ({ code: `${x}.${add(kind)}(${e.code});`, text: `${kind === "stack" ? "Push" : "Enqueue"} ${e.code}`, run: (st) => { const v = e.ev(st); need(st, x).items.push(v); } }),
    drop: (x, kind) => ({ code: `${x}.${rem(kind)}();`, text: kind === "stack" ? "Pop" : "Dequeue", run: (st) => { take(st, x); } }),
    reverse: (x) => ({ code: `${x}.reverse();`, text: "Reverse", run: (st) => { need(st, x).items.reverse(); } }),
    forN: (k, body) => ({
      code: `for (int i = 0; i < ${k}; i++) {\n    ${body.code}\n}`,
      run: (st) => { for (let i = 0; i < k; i++) body.run(st); },
    }),
    whileNotEmpty: (x, body) => ({
      code: `while (!${x}.is_empty()) {\n    ${body.code}\n}`,
      run: (st) => { let guard = 0; while (need(st, x).items.length) { body.run(st); if (++guard > 1000) throw new Invalid("loop"); } },
    }),
    whileSizeAbove: (x, k, body) => ({
      code: `while (${x}.size() > ${k}) {\n    ${body.code}\n}`,
      run: (st) => { let guard = 0; while (need(st, x).items.length > k) { body.run(st); if (++guard > 1000) throw new Invalid("loop"); } },
    }),
  };

  function simulate(stmts) {
    const st = {}, snaps = [];
    for (const s of stmts) { s.run(st); snaps.push(clone(st)); }
    return { st, snaps };
  }

  // ---------- random statement for one structure ----------
  function randomOp(r, st, x, others, opts = {}) {
    const kind = st[x].kind, n = st[x].items.length;
    const choices = [];
    choices.push(["lit", 4]);
    if (n > 0) choices.push(["drop", 3], ["peekexpr", 2], ["takeexpr", 2]);
    choices.push(["sizeexpr", 1]);
    if (opts.reverse && n > 1) choices.push(["reverse", 1]);
    const src = others.filter((o) => st[o].items.length > 0);
    if (src.length) choices.push(["fromother", 3]);
    const total = choices.reduce((a, c) => a + c[1], 0);
    let t = r() * total, which = choices[0][0];
    for (const [c, w] of choices) { if ((t -= w) < 0) { which = c; break; } }
    const k = R(r, 1, 9), op = pick(r, ["+", "*", "+", "-"]);
    switch (which) {
      case "lit": return S.add(x, kind, E.lit(R(r, 1, 20)));
      case "drop": return S.drop(x, kind);
      case "peekexpr": return S.add(x, kind, E.bin(E.peek(x), op, op === "*" ? R(r, 2, 4) : k));
      case "takeexpr": return S.add(x, kind, E.bin(E.take(x, kind), op, op === "*" ? R(r, 2, 4) : k));
      case "sizeexpr": return S.add(x, kind, r() < 0.5 ? E.size(x) : E.bin(E.size(x), "+", k));
      case "reverse": return S.reverse(x);
      case "fromother": {
        const o = pick(r, src), ok = st[o].kind;
        const e = r() < 0.5 ? E.take(o, ok) : r() < 0.5 ? E.peek(o) : E.bin(E.take(o, ok), op, op === "*" ? R(r, 2, 4) : k);
        return S.add(x, kind, e);
      }
    }
  }

  function values(r, n) { const v = []; while (v.length < n) { const x = R(r, 1, 9); if (!v.includes(x) || r() < 0.15) v.push(x); } return v; }

  // ---------- question templates ----------
  const TEMPLATES = {
    stack(r) {
      const st = [];
      st.push(r() < 0.5 ? S.declEmpty("stack", "s") : S.declInit("stack", "s", values(r, R(r, 2, 4))));
      return { stmts: st, focus: ["s"], ask: "s", len: R(r, 5, 8), reverse: r() < 0.3 };
    },
    queue(r) {
      const st = [];
      st.push(r() < 0.5 ? S.declEmpty("queue", "q") : S.declInit("queue", "q", values(r, R(r, 2, 4))));
      return { stmts: st, focus: ["q"], ask: "q", len: R(r, 5, 8), reverse: r() < 0.3 };
    },
    transfer(r) {
      const fromStack = r() < 0.6;
      const vals = values(r, R(r, 4, 6));
      const k = R(r, 2, vals.length - 1);
      const stmts = [];
      if (fromStack) {
        stmts.push(S.declInit("stack", "s", vals), S.declEmpty("queue", "q"));
        stmts.push(S.forN(k, S.add("q", "queue", E.take("s", "stack"))));
        stmts.push(r() < 0.5 ? S.whileNotEmpty("q", S.add("s", "stack", E.take("q", "queue")))
                              : S.forN(R(r, 1, k), S.add("s", "stack", E.take("q", "queue"))));
        return { stmts, ask: pick(r, ["s", "s", "q"]), len: 0 };
      }
      stmts.push(S.declInit("queue", "q", vals), S.declEmpty("stack", "s"));
      stmts.push(S.forN(k, S.add("s", "stack", E.take("q", "queue"))));
      stmts.push(r() < 0.5 ? S.whileNotEmpty("s", S.add("q", "queue", E.take("s", "stack")))
                            : S.forN(R(r, 1, k), S.add("q", "queue", E.take("s", "stack"))));
      return { stmts, ask: pick(r, ["q", "q", "s"]), len: 0 };
    },
    copy(r) {
      const kind = r() < 0.5 ? "stack" : "queue";
      const stmts = [S.declInit(kind, "a", values(r, R(r, 3, 4)))];
      if (r() < 0.7) stmts.push(S.declCopy(kind, "b", "a"));
      else { stmts.push(S.declInit(kind, "b", values(r, 2))); stmts.push(S.assignCopy("b", "a")); }
      return { stmts, focus: ["a", "b"], ask: pick(r, ["a", "b"]), len: R(r, 3, 4) };
    },
    move(r) {
      const kind = r() < 0.5 ? "stack" : "queue";
      const stmts = [S.declInit(kind, "a", values(r, R(r, 3, 4)))];
      if (r() < 0.7) stmts.push(S.declMove(kind, "b", "a"));
      else { stmts.push(S.declInit(kind, "b", values(r, 2))); stmts.push(S.assignMove("b", "a")); }
      return { stmts, focus: ["a", "b"], ask: pick(r, ["a", "b"]), len: R(r, 3, 4) };
    },
    mixed(r) {
      const stmts = [S.declInit("stack", "s", values(r, R(r, 2, 3))), S.declInit("queue", "q", values(r, R(r, 2, 3)))];
      return { stmts, focus: ["s", "q"], ask: pick(r, ["s", "q"]), len: R(r, 5, 7), reverse: r() < 0.5 };
    },
    reduce(r) {
      const kind = r() < 0.5 ? "stack" : "queue";
      const x = kind === "stack" ? "s" : "q";
      const stmts = [S.declInit(kind, x, values(r, R(r, 5, 7)))];
      const other = kind === "stack" ? ["queue", "q2"] : ["stack", "s2"];
      stmts.push(S.declEmpty(other[0], other[1]));
      stmts.push(S.whileSizeAbove(x, R(r, 1, 3), S.add(other[1], other[0], E.bin(E.take(x, kind), "*", 2))));
      return { stmts, focus: [x, other[1]], ask: pick(r, [x, other[1], other[1]]), len: R(r, 1, 3), reverse: r() < 0.4 };
    },
  };
  // written instructions ("Push 5, Pop, ...") on one structure, literals only
  TEMPLATES.instructions = (r) => {
    const kind = r() < 0.5 ? "stack" : "queue", x = kind === "stack" ? "s" : "q";
    const stmts = [S.declEmpty(kind, x)];
    let n = 0;
    const len = R(r, 7, 11);
    for (let i = 0; i < len; i++) {
      const roll = r();
      if (n > 1 && roll < 0.08) stmts.push(S.reverse(x));
      else if (n > 0 && roll < 0.42) { stmts.push(S.drop(x, kind)); n--; }
      else { stmts.push(S.add(x, kind, E.lit(R(r, 1, 30)))); n++; }
    }
    return { stmts, ask: x, len: 0, instructions: true };
  };
  const KINDS = Object.keys(TEMPLATES);
  const KIND_LABEL = { stack: "Stack operations", queue: "Queue operations", transfer: "Stack ↔ queue transfer", copy: "Copy semantics", move: "Move semantics", mixed: "Stack and queue together", reduce: "Loops", instructions: "Written instructions" };

  function generate(seed, kind) {
    const r = rng(seed);
    for (let attempt = 0; attempt < 200; attempt++) {
      const k = kind || pick(r, KINDS);
      const t = TEMPLATES[k](r);
      let { stmts } = t;
      try {
        let st = simulate(stmts).st;
        const focus = t.focus || [];
        for (let i = 0; i < (t.len || 0); i++) {
          let placed = false;
          for (let tries = 0; tries < 20 && !placed; tries++) {
            const x = pick(r, focus);
            const s = randomOp(r, st, x, focus.filter((o) => o !== x), { reverse: t.reverse });
            const trial = clone(st);
            try { s.run(trial); stmts = stmts.concat([s]); st = trial; placed = true; } catch (e) { if (!(e instanceof Invalid)) throw e; }
          }
        }
        // avoid boring answers
        const final = st[t.ask];
        if (!final || final.items.length < 2 || final.items.length > 8) continue;
        if (final.items.some((v) => Math.abs(v) > 999)) continue;
        return build(stmts, t.ask, k, t.instructions);
      } catch (e) { if (!(e instanceof Invalid)) throw e; }
    }
    throw new Error("could not generate a question");
  }

  function build(stmts, ask, kind, instructions) {
    const { st, snaps } = simulate(stmts);
    return {
      kind, ask, structure: st[ask].kind, instructions: !!instructions,
      texts: stmts.map((s) => s.text || ""),
      code: stmts.map((s) => s.code).join("\n"),
      lines: stmts.map((s) => s.code),
      answer: st[ask].items.slice(),
      snaps,
    };
  }

  // ---------- the Week 3 LMS practice questions, written with the same builder ----------
  const PRESETS = [
    { title: "Practice 03 · Q5", make: () => build([
        S.declInit("stack", "s", [1, 2, 3, 4, 5]), S.declEmpty("queue", "q"),
        S.forN(3, S.add("q", "queue", E.take("s", "stack"))),
        S.whileNotEmpty("q", S.add("s", "stack", E.take("q", "queue"))),
      ], "s", "transfer") },
    { title: "Practice 03 · Q6", make: () => build([
        S.declEmpty("queue", "q"),
        S.add("q", "queue", E.lit(5)), S.add("q", "queue", E.lit(8)), S.add("q", "queue", E.lit(2)),
        S.drop("q", "queue"),
        S.add("q", "queue", E.bin(E.peek("q"), "*", 3)),
        S.add("q", "queue", E.size("q")),
        S.drop("q", "queue"),
      ], "q", "queue") },
    { title: "Practice 03 · Q7", make: () => build([
        S.declInit("queue", "a", [1, 2, 3]),
        S.declMove("queue", "b", "a"),
        S.add("a", "queue", E.lit(7)),
        S.add("b", "queue", E.peek("a")),
        S.add("a", "queue", E.bin(E.take("b", "queue"), "+", 10)),
      ], "b", "move") },
    { title: "Practice 03 · Q8", make: () => build([
        S.declEmpty("stack", "s"),
        S.add("s", "stack", E.lit(4)), S.add("s", "stack", E.lit(7)), S.add("s", "stack", E.lit(1)),
        S.drop("s", "stack"),
        S.add("s", "stack", E.lit(9)),
        S.add("s", "stack", E.bin(E.peek("s"), "+", 2)),
        S.drop("s", "stack"),
        S.add("s", "stack", E.size("s")),
      ], "s", "stack") },
    { title: "Practice 03 · Q9", make: () => build([
        S.declInit("stack", "a", [1, 2, 3]),
        S.declCopy("stack", "b", "a"),
        S.drop("b", "stack"),
        S.add("b", "stack", E.bin(E.take("a", "stack"), "*", 10)),
        S.add("a", "stack", E.bin(E.peek("b"), "+", 1)),
      ], "a", "copy") },
  ];

  const api = { generate, PRESETS, KINDS, KIND_LABEL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DrawGen = api;
})(typeof window !== "undefined" ? window : globalThis);
