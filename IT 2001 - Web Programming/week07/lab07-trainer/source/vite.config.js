import { defineConfig } from 'vite';

// Only PHP 8.4 is bundled; intl (icu.dat, ~30 MB) and the other PHP versions are replaced by a stub.
const STUB = '\0php-stub';
const phpStub = {
  name: 'php-stub',
  enforce: 'pre',
  resolveId(id) {
    if (id.endsWith('icu.dat') || /intl\.so(\?url)?$/.test(id) || /^@php-wasm\/web-(5-2|7-4|8-0|8-1|8-2|8-3|8-5)$/.test(id)) return STUB;
  },
  load(id) {
    if (id === STUB) return 'export default ""; export async function getPHPLoaderModule() { throw new Error("This PHP version is not bundled in the trainer."); }';
  },
};

export default defineConfig({
  base: './',
  plugins: [phpStub],
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 4000 },
  optimizeDeps: { exclude: ['@php-wasm/web', '@php-wasm/universal'] },
  worker: { format: 'es' },
  server: { port: 5187 },
});
