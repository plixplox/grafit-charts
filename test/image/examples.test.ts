/**
 * Examples-as-tests: each examples/<name> is rendered in real Chromium
 * (vitest browser mode) and compared against the baseline test/image/__screenshots__/<name>.png.
 *
 * Updating baselines: npm run test:image:update. On mismatch, reference/actual/diff
 * are written to .vitest-attachments/ (the path is printed in the error message).
 * Baselines depend on OS fonts and the Chromium version (pinned in package-lock) —
 * regenerate them when the environment changes.
 */
/// <reference types="vite/client" />
import type { ChartOptions } from 'grafit-charts';
import { Charts } from 'grafit-charts';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';

const WIDTH = 640;
const HEIGHT = 380;

const configs = import.meta.glob<{ createOptions: () => ChartOptions }>('../../examples/*/config.ts');

for (const [path, loadConfig] of Object.entries(configs)) {
  const name = path.split('/').at(-2)!;
  test(name, async () => {
    const { createOptions } = await loadConfig();
    const container = document.createElement('div');
    Object.assign(container.style, { width: `${WIDTH}px`, height: `${HEIGHT}px` });
    document.body.appendChild(container);
    const chart = Charts.create({
      ...createOptions(),
      container,
      width: WIDTH,
      height: HEIGHT,
      // screenshot determinism: no entrance animation
      animation: { enabled: false },
    });
    try {
      await chart.waitForUpdate();
      await expect(page.elementLocator(container)).toMatchScreenshot(name);
    } finally {
      chart.destroy();
      container.remove();
    }
  });
}
