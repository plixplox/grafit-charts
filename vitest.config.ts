import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = {
  'grafit-charts': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'image',
          include: ['test/image/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', viewport: { width: 800, height: 600 } }],
            expect: {
              toMatchScreenshot: {
                comparatorName: 'pixelmatch',
                comparatorOptions: {
                  // Попиксельный YIQ-допуск; доля расхождений — запас на дрейф
                  // антиалиасинга между версиями Chromium.
                  threshold: 0.1,
                  allowedMismatchedPixelRatio: 0.0005,
                },
                // Один браузер и одна ОС — без суффиксов в именах эталонов.
                resolveScreenshotPath: ({ root, testFileDirectory, screenshotDirectory, arg, ext }) =>
                  `${root}/${testFileDirectory}/${screenshotDirectory}/${arg}${ext}`,
              },
            },
          },
        },
      },
    ],
  },
});
