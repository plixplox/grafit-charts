---
aside: false
---

# Theme builder

Pick a built-in theme as a starting point, adjust the tokens on the left and watch
every chart type follow along. When it looks right, download the JSON and pass it
to `Charts.create` as `theme`.

Your work is kept in the browser's local storage, so a reload will not lose it.

<ClientOnly>
  <ThemeBuilder />
</ClientOnly>

## Using the file you downloaded

The export is a plain `ThemeOptions` object — no build step, no import from the
library needed:

```ts
import myTheme from './grafit-theme.json';
import { Charts } from 'grafit-charts';

Charts.create({
  container: document.getElementById('chart')!,
  data,
  series: [{ type: 'bar', xField: 'month', yField: 'revenue' }],
  theme: myTheme,
});
```

Only the tokens you actually changed end up in the file — everything else keeps
coming from `baseTheme`. That means a theme stays readable, and a later release
that improves a base theme improves yours with it.

## Offering a choice of themes

The built-in names are exported as `THEME_NAMES`, which is all a select needs:

```ts
import { Charts, THEME_NAMES, type ThemeName } from 'grafit-charts';

const select = document.querySelector('select')!;
select.append(...THEME_NAMES.map((name) => new Option(name, name)));
select.addEventListener('change', () => {
  void chart.updateDelta({ theme: select.value as ThemeName });
});
```

Mixing the two works as well — hand a select your own exported themes and switch
between whole `ThemeOptions` objects the same way.

## Where each section lands in the file

The panel writes into three different places, and the JSON shows which:

- **Palette, colours, typography, marks, positive/negative** → `palette` and `params`,
  the design tokens every series type reads.
- **Axes** → the `axis` block. `ChartOptions.axes` is an array, so a theme cannot
  reach it through `overrides` — the block exists for exactly that reason.
- **Legend and tooltip** → `overrides.common`. Those are ordinary `ChartOptions`
  blocks, so the theme layers real options under the chart's own — no separate
  tokens, no second path to the same pixel.

Anything else already in an imported file's `overrides` is carried through
untouched, including per-series-type defaults such as `overrides.bar.series`.

## What the previews cannot show

The tooltip appears on hover — move the pointer over the first two previews to
check its colours. The crosshair label and the context menu (right click) follow
`backgroundColor`, `foregroundColor` and `mutedColor` and have no controls of
their own.

Per-series-type styling — rounded bars but square columns, say — is not a token
either. That lives in [`overrides`](./themes#overrides).
