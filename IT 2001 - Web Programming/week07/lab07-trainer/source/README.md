# Lab 07 Trainer – source

Source of the Lab 07 (JWT Authentication & Middleware) trainer one folder up.
Vite + @php-wasm/web 3.1.62 (PHP 8.4 in the browser) + Monaco editor.

- `php/ref/` – reference backend (CampusEvents week-07, SQLite BaseDao), also the "Show solution" code
- `php/starters/` – starter files of the 12 tasks
- `php/vendor/` – FlightPHP 3.19.5 + firebase/php-jwt 7.2.2
- `src/tasks.js` – tasks and checks, `src/checker.js` – check helpers, `src/engine.js` – PHP runner
- `scripts/selftest.mjs` – Node test (reference must pass, starters must fail), `mutants.mjs`, `browser-test.mjs` (Playwright)

Rebuild:

```
npm install
npm run build
node scripts/selftest.mjs ref
```

The build lands in `dist/`; copy its contents one folder up.
