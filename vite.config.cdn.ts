import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Самодостаточный CDN-бандл (как jquery.min.js): один минифицированный файл,
// все модули зарегистрированы, глобал window.Grafit.
// <script src="https://cdn.jsdelivr.net/npm/grafit-charts/dist/grafit.min.js"></script>
// Grafit.Charts.create({ ... })
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    emptyOutDir: false, // dist уже наполнен основной ESM-сборкой
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'Grafit',
      formats: ['iife'],
      fileName: () => 'grafit.min.js',
    },
    minify: true,
    sourcemap: false,
  },
});
