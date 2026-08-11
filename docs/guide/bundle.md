# Installation and Bundle Size

The package ships three entry points plus a standalone CDN file — pick the one
that matches your priority: simplicity or kilobytes.

| Entry point             | What's inside                                                       | When to use                      |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `grafit-charts`         | everything included and registered: widgets, series, axes, features | prototypes, internal tools       |
| `grafit-charts/core`    | the engine + `register()`, with no modules at all                   | when bundle size matters         |
| `grafit-charts/modules` | all modules as named exports: widgets, series, axes, features       | paired with `grafit-charts/core` |

## Full entry point

The shortest path — everything is already registered:

```ts
import { Charts } from 'grafit-charts';

Charts.create({ container, data, series: [{ type: 'line', yField: 'y' }] });
```

The price of convenience: the entire library ends up in your bundle, including
series you never use (~43 KB gzip).

## Minimal bundle: `grafit-charts/core` + `grafit-charts/modules`

The engine knows nothing about any module — series, axes, chart widgets and
features are wired up explicitly, just like in ECharts or Chart.js. Anything
not registered gets removed by tree-shaking:

```ts
import { Charts, register } from 'grafit-charts/core';
import {
  cartesianChartModule,
  lineSeriesModule,
  categoryAxisModule,
  numberAxisModule,
  tooltipModule,
  legendModule,
} from 'grafit-charts/modules';

register(cartesianChartModule, lineSeriesModule, categoryAxisModule, numberAxisModule, tooltipModule, legendModule);

Charts.create({ container, data, series: [{ type: 'line', yField: 'y' }] });
```

This bundle is ~20 KB gzip versus ~43 KB for the full entry point (~18 KB
without the tooltip and legend).

There are three kinds of modules to register:

| Kind            | Modules                                                                                                                                               | What's required                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Chart widgets   | `cartesianChartModule`, `polarChartModule`, `standaloneChartModule`                                                                                   | exactly the one your series need (table below); without it `Charts.create` throws an error |
| Series and axes | `lineSeriesModule`, `numberAxisModule`, …                                                                                                             | every type you use                                                                         |
| Features        | `tooltipModule`, `legendModule`, `gradientLegendModule`, `crosshairModule`, `navigatorModule`, `annotationsModule`, `syncModule`, `contextMenuModule` | optional: an unregistered feature simply doesn't work (with a console warning)             |

Module names are derived from the type: `'box-plot'` → `boxPlotSeriesModule`,
`'radial-gauge'` → `radialGaugeSeriesModule`; axes — `numberAxisModule`,
`timeAxisModule`, and so on.

### Which widget each series needs

| Widget                  | Series                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `cartesianChartModule`  | line, bar, area, scatter, bubble, histogram, heatmap, range-bar, range-area, box-plot, waterfall, funnel, cone-funnel, candlestick, ohlc |
| `polarChartModule`      | pie, donut, radar-line, radar-area, nightingale, radial-column, radial-bar                                                               |
| `standaloneChartModule` | treemap, sunburst, pyramid, sankey, chord, radial-gauge, linear-gauge                                                                    |

The `createFinancialChart`/`createGauge`/`createSparkline` presets assemble
options on top of regular series: financial — candlestick/ohlc (cartesian) +
`ordinalTimeAxisModule`, `navigatorModule`, `crosshairModule`; gauge —
radial-/linear-gauge (standalone); sparkline — line/area/bar (cartesian).

### What each feature is responsible for

| Module                 | Options / behavior                                        |
| ---------------------- | --------------------------------------------------------- |
| `tooltipModule`        | `tooltip` — hover tooltip                                 |
| `legendModule`         | `legend` — legend with series toggling                    |
| `gradientLegendModule` | `gradientLegend` — heatmap color scale                    |
| `crosshairModule`      | `crosshair` — crosshair with axis labels                  |
| `navigatorModule`      | `navigator` — range bar below the chart                   |
| `annotationsModule`    | `annotations` — lines/ranges/labels on the chart          |
| `syncModule`           | `sync` — highlight and zoom synchronization across charts |
| `contextMenuModule`    | `contextMenu` — right click: “Download PNG”, reset zoom   |

Zoom, data selection (`selection`), events (`listeners`), themes, animation
and state are part of the core — no separate registration needed.

::: warning Don't forget the axes
Cartesian series need axis modules. If axes are not specified in the options,
the chart picks a pair on its own: `category` + `number` for most series,
`number` + `number` for scatter/bubble/histogram. Register the types you'll
need, or you'll get an error.
:::

::: tip The tooltip and legend are modules too
With the full entry point they are “just there”, but when building with
`grafit-charts/core`, without `tooltipModule`/`legendModule` the chart silently
renders with no tooltip or legend (a warning only appears if they are
explicitly configured in the options). If you need them — register them.
:::

If a type is not registered, the chart throws a clear error:

```
grafit: series type "sankey" is not registered. Import the module from
'grafit-charts/modules' and pass it to register() from 'grafit-charts/core', or use the
full 'grafit' entry point.
```

Modules do nothing on import — registration only happens on an explicit
`register()` call. That is why the package honestly declares
`sideEffects: false`, and the bundler can safely drop whatever is unused.

## CDN without a build step

For pages without a bundler there is a self-contained file
`dist/grafit.min.js` (IIFE, all modules registered, global `Grafit`):

```html
<script src="https://cdn.jsdelivr.net/npm/grafit-charts/dist/grafit.min.js"></script>
<script>
  Grafit.Charts.create({
    container: document.getElementById('chart'),
    data: [{ month: 'Jan', revenue: 42 }],
    series: [{ type: 'bar', xField: 'month', yField: 'revenue' }],
  });
</script>
```

The `unpkg`/`jsdelivr` fields in package.json point to this file, so the short
URL `https://cdn.jsdelivr.net/npm/grafit-charts` serves it as well.

::: tip ESM-only
The npm package is distributed as ESM only (`"type": "module"`); CommonJS
`require('grafit-charts')` is not supported. For `<script>` without a bundler, use
the CDN file above.
:::
