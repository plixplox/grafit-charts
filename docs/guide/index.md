# Quick Start

`grafit` is a dependency-free TypeScript charting library built on Canvas:
declarative configuration with a single object, 27 series types, interactivity
and themes out of the box.

## Step 1. Container

The chart renders into any block element and takes its size from it:

```html
<div id="chart" style="width: 100%; height: 360px"></div>
```

## Step 2. Your first chart

```ts
import { Charts } from 'grafit-charts';

const chart = Charts.create({
  container: document.getElementById('chart')!,
  data: [
    { month: 'Jan', revenue: 42 },
    { month: 'Feb', revenue: 58 },
    { month: 'Mar', revenue: 51 },
  ],
  series: [{ type: 'bar', xField: 'month', yField: 'revenue', name: 'Revenue' }],
  title: { text: 'Revenue by month' },
});
```

`data` is an array of flat objects; the series specifies which fields to plot
(`xField`/`yField`) and the display name (`name`). Axes, legend, tooltips and
the entry animation are enabled automatically.

Here is what the result looks like with a couple of series:

::: chart-example line-basic

## Step 3. Updating

Options are immutable — changes are passed via methods and applied with
animation:

```ts
await chart.updateDelta({ theme: 'dark' }); // targeted change
await chart.update({ ...options, data: freshData }); // full replacement
chart.destroy(); // when you are done
```

## Step 4. Where to go next

| I want to…                          | Page                                                                |
| ----------------------------------- | ------------------------------------------------------------------- |
| understand how options work          | [Configuration](/guide/options)                                      |
| reduce the bundle or use a CDN       | [Installation and bundle size](/guide/bundle)                        |
| pick a chart type                    | the “Series” section — from [Line](/series/line) to [Gauges](/series/gauge) |
| see options shared by all series     | [Common series options](/guide/series-options)                       |
| configure axes and formats           | [Axes](/guide/axes)                                                  |
| tooltip, legend, annotations         | the “Chart components” section — starting with [Legend](/interactivity/legend) |
| zoom, selection, events              | the “Interactivity” section — starting with [Zoom](/interactivity/zoom) |
| dark theme and custom colors         | [Themes](/guide/themes)                                              |
| compact charts inside a table        | [Sparklines](/series/sparklines)                                     |
| candlestick chart with a navigator   | the preset on the [Candlestick](/series/candlestick) page            |

::: warning Status
The library is under active development. The API may change without backward compatibility.
:::
