// node scripts/browser-test.mjs [url] – every task with the reference solution, the API client, phone width
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
const require = createRequire(os.homedir() + '/.npm/_npx/381cec31605a419a/node_modules/');
const { chromium } = require('playwright');
const FILES = JSON.parse(fs.readFileSync('src/generated/files.json', 'utf8'));
const { TASKS } = await import('../src/tasks.js');
const url = process.argv[2] || 'http://127.0.0.1:5187/';
const SH = os.homedir() + '/lab07-trener/shots/';
const base = os.homedir() + '/.cache/ms-playwright/chromium_headless_shell-1248/';
const exe = fs.readdirSync(base).map((d) => base + d + '/chrome-headless-shell').find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript((codes) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('ibu-it2001-lab07-trainer-v1', JSON.stringify({ code: Object.fromEntries(Object.entries(codes).map(([id, c]) => [id, { mode: 'file', text: { file: c }, touched: true }])) }));
}, Object.fromEntries(TASKS.map((t) => [t.id, FILES.base[t.file]])));
await page.goto(url);
await page.waitForSelector('#phpBox.ready', { timeout: 60000 });
await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 }).catch(() => errors.push('Monaco did not load'));
await page.screenshot({ path: SH + 'a2-top.png' });
let bad = 0;
for (const t of TASKS) {
  await page.click(`.titem[data-id="${t.id}"]`);
  await page.waitForSelector('.que .check');
  await page.waitForTimeout(150);
  await page.click('.que .check');
  await page.waitForSelector('.outcome .verdict', { timeout: 60000 });
  const v = (await page.textContent('.outcome .verdict')).trim();
  const ok = v === 'Passed all checks!';
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'BAD ') + t.id.padEnd(18) + v);
}
await page.click('.titem[data-id="auth-middleware"]');
await page.click('.mode[data-mode="lines"]');
await page.waitForTimeout(800);
const gaps = await page.evaluate(() => window.monaco.editor.getEditors().filter((e) => e.getModel()).map((e) => e.getValue()).join('').split('TODO: missing line').length - 1);
console.log('gaps in missing-lines mode:', gaps);
await page.click('.que .check'); await page.waitForSelector('.outcome .verdict');
console.log('check with gaps:', (await page.textContent('.outcome .verdict')).trim());
await page.evaluate(() => document.querySelector('.sol').open = true);
await page.screenshot({ path: SH + 'a2-task.png', fullPage: true });
console.log('todo block:', (await page.textContent('pre.todo')).split('\n')[1]);
await page.click('#examBtn');
console.log('exam mode hides hints/solution:', await page.evaluate(() => [...document.querySelectorAll('.que details.hints, .que details.sol')].every((d) => getComputedStyle(d).display === 'none')));
await page.click('#examBtn');
// API client
await page.click('#tab-client');
await page.waitForSelector('[data-q="0"]');
const st = async () => (await page.textContent('#c-resp .verdict')).trim();
await page.click('[data-q="0"]'); await page.waitForSelector('#c-resp .verdict');
console.log('login:', await st(), 'token len', (await page.inputValue('#c-token')).length);
await page.click('#c-clear'); await page.click('[data-q="4"]'); await page.waitForTimeout(400); console.log('events no token:', await st());
await page.click('[data-q="0"]'); await page.waitForTimeout(500); await page.click('[data-q="4"]'); await page.waitForTimeout(400); console.log('events token:', await st());
await page.click('#c-tamper'); await page.click('#c-send'); await page.waitForTimeout(400); console.log('tampered:', await st());
await page.click('[data-log="error.log"]');
console.log('error.log tail:', (await page.textContent('#c-log')).split('\n').slice(-1).join(''));
await page.screenshot({ path: SH + 'a2-client.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
for (const tab of ['code', 'client']) {
  await page.click('#tab-' + tab); await page.waitForTimeout(700);
  console.log('mobile', tab, 'scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth), await page.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('.wrap *')].filter((e) => e.getBoundingClientRect().right > W + 1 && !e.closest('pre') && !e.closest('.monaco-editor') && !e.closest('.results')).slice(0, 4).map((e) => e.tagName + '.' + e.className + ':' + e.textContent.slice(0, 30)); }));
  await page.screenshot({ path: SH + `a2-mobile-${tab}.png` });
}
console.log('page errors:', errors.length ? errors.slice(0, 6) : 'none');
await browser.close();
process.exit(bad ? 1 : 0);
