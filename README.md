# Grafit charts

[![npm](https://img.shields.io/npm/v/grafit-charts)](https://www.npmjs.com/package/grafit-charts)
[![license](https://img.shields.io/npm/l/grafit-charts)](https://github.com/plixplox/grafit-charts/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-grafit--charts-436ff4)](https://plixplox.github.io/grafit-charts/)

Declarative charting library for the browser: a single serializable options
object describes the whole chart — data, series, axes, legend, interactivity.
Rendering is done on Canvas 2D through a custom scene graph, with zero
runtime dependencies. Written in TypeScript, types ship with the package.

- **29 series types** — from line/bar/area to heatmap, candlestick, treemap,
  sankey and gauges; 6 axis types.
- **Interactivity out of the box**: tooltips, highlighting, legend with
  series toggling, zoom + navigator, crosshair, data selection, chart
  synchronization, annotations, context menu, PNG export.
- **Modular architecture**: chart widgets, series, axes and features are
  registerable modules; your bundle contains only what you use (a line
  chart is ~18 KB gzip instead of ~43 KB for the whole library).
- Themes (light/dark/custom), animations, localization, accessibility
  (keyboard navigation, ARIA), serializable state.

## Installation

```bash
npm install grafit-charts
```

The package is ESM-only, with three entry points:

```ts
// 1. Batteries included — least code, the whole library in your bundle (~43 KB gzip)
import { Charts } from 'grafit-charts';
```

```ts
// 2. Minimal bundle — register only the modules you need (~18–20 KB gzip)
import { Charts, register } from 'grafit-charts/core';
import {
  cartesianChartModule, // chart widget (polar/standalone are separate modules)
  barSeriesModule,
  categoryAxisModule,
  numberAxisModule,
  tooltipModule, // features are modular too: legend, navigator, crosshair, ...
} from 'grafit-charts/modules';

register(cartesianChartModule, barSeriesModule, categoryAxisModule, numberAxisModule, tooltipModule);
```

```html
<!-- 3. CDN without a bundler: a single file, all modules included, global Grafit -->
<script src="https://cdn.jsdelivr.net/npm/grafit-charts/dist/grafit.min.js"></script>
<script>
  Grafit.Charts.create({ ... });
</script>
```

More on entry points, tree-shaking and the series → module mapping in the
[Installation and bundle size](https://plixplox.github.io/grafit-charts/guide/bundle) guide;
full documentation: https://plixplox.github.io/grafit-charts/

## Example: bar chart

```html
<div id="chart" style="width: 100%; height: 360px"></div>
```

```ts
import { Charts } from 'grafit-charts';

const chart = Charts.create({
  container: document.getElementById('chart')!,
  data: [
    { city: 'Moscow', population: 13.1 },
    { city: 'Saint Petersburg', population: 5.6 },
    { city: 'Novosibirsk', population: 1.6 },
    { city: 'Yekaterinburg', population: 1.5 },
    { city: 'Kazan', population: 1.3 },
  ],
  series: [{ type: 'bar', xField: 'city', yField: 'population', name: 'Population', cornerRadius: 4 }],
  title: { text: 'City population' },
  subtitle: { text: 'millions of people' },
});
```

Axes, tooltip and entrance animation are enabled automatically; the chart
takes its size from the container and tracks it with a ResizeObserver.
Updates go through instance methods:

```ts
await chart.updateDelta({ theme: 'dark' }); // partial update
await chart.update({ ...options, data: freshData }); // full replace (animated)
chart.destroy(); // when done
```

## Features

- **Series**: line, bar, area, scatter, bubble, histogram, heatmap, range-bar/area, box-plot, waterfall, funnel, cone-funnel, candlestick, ohlc, pie, donut, radar, nightingale, radial-column, radial-bar, treemap, sunburst, pyramid, sankey, chord, gauges
- **Axes**: number, category, time, log, ordinal-time, grouped-category; crossLines, interval, label thinning
- **Interactivity**: tooltips, highlighting, legend with series toggling, zoom + navigator, crosshair, chart synchronization, context menu, declarative annotations
- **More**: themes (default/dark/custom), entrance animation, state (getState/setState), PNG export, keyboard navigation, localization
- **Presets**: `createFinancialChart`, `createGauge`, `createSparkline`
