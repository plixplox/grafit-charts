import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// ESM-дистрибутив для бандлеров: preserveModules повторяет структуру src,
// чтобы tree-shaking у потребителя выбрасывал целые неиспользуемые файлы.
// CDN-бандл собирается отдельно (vite.config.cdn.ts).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        core: fileURLToPath(new URL('./src/core.ts', import.meta.url)),
        modules: fileURLToPath(new URL('./src/modules.ts', import.meta.url)),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    minify: false, // минифицирует бандлер потребителя; читаемый dist удобнее для отладки
    sourcemap: false, // dist не минифицирован и читаем сам по себе; map — 70% веса пакета
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
});
