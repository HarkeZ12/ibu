FENMS 0121 - Assignment 2 prep (Weeks 3-5)

Open assignment-2-prep.html through a web server (GitHub Pages, or `python3 -m http.server`);
it does not work from file:// because the compiler runs in a Web Worker.

- Coding: 50 tasks. Lab 03-05 methods (whole method or missing lines) and the LMS practice
  questions of weeks 3-5. Answers are compiled by Clang/LLD built for WebAssembly
  (@yowasp/clang, loaded from cdn.jsdelivr.net, unpkg.com as fallback) and every test runs in a
  fresh instance of the program. About 100 MB is downloaded the first time, then cached.
- Algorithm tracing: random questions for binary search, bubble, selection, insertion and
  Shell sort, plus all LMS practice tracing questions from weeks 4 and 5.
- Stacks & queues: random "draw the final state" questions (code or written instructions)
  plus the week 3 LMS practice ones.

Look: glass theme of the reading pages (static backdrop, battery saver toggle). Editor: Monaco 0.52.2 from cdnjs
with C++ suggestions (keywords, names from the lab code, for/while/if/newnode snippets).
Files: assignment-2-prep.html, app.js, code-bank.js (generated), draw-gen.js, cxx-worker.js,
wasi.js, images/two-stack.png.
Rebuild (in _drafts only): .build/gen_code.py (course code -> code-bank.js, checks every
solution with g++ and that 11 known wrong answers fail; it also writes .build/mutants.json so the same wrong answers can be re-run in the browser), .build/check_draw.mjs (checks draw-gen.js against the real Stack/Queue),
.build/build.py (page.html + base CSS -> assignment-2-prep.html).
