# Histogram

Distribution of a numeric field across bins. `xField` is a numeric field; without `yField`, the number of records is counted.

::: chart-example histogram-basic

## Bin count

`binCount` controls the granularity — a target, not a promise: the step is rounded
to 1/2/5×10ⁿ so the edges read as numbers a person would pick, which can shift the
count by one or two. `nice: false` gives exactly `binCount` bins spanning the data.

::: chart-example histogram-bins

Without `binCount` the count comes from the data. The rules are the ones statistics
gave them, under their usual names — `'auto'` (the default: Freedman–Diaconis, never
below Sturges), `'sturges'`, `'fd'`, `'scott'`, `'rice'`:

```ts
series: [{ type: 'histogram', xField: 'response', binCount: 'fd' }];
```

## Bin width

`binWidth` is the other way to ask: the step is fixed and the count follows from it —
this is how BI tools phrase binning. `binOrigin` says what the grid is aligned to
(the default `0`, so edges land on multiples of the width):

::: chart-example histogram-binwidth

```ts
// weeks starting on Monday rather than on the first value
series: [{ type: 'histogram', xField: 'day', binWidth: 7, binOrigin: 1 }];
```

Explicit `bins` win over both: `[[0, 18], [18, 65], [65, 120]]` builds three bins of
unequal width. A value on an edge goes to the bin on the right (`[x0, x1)`), with the
last bin closed on both ends so the maximum is never dropped; `binInclusive: 'right'`
mirrors that.

## Range and outliers

`domain` bins a fixed range instead of the data extent — a long tail no longer flattens
the bars that matter. Values outside it are dropped, or piled into the edge bins with
`outliers: 'clamp'`:

::: chart-example histogram-outliers

## What the height means

`normalize` restates the bars without touching the bins — the same distribution
answering a different question:

| `normalize`            | A bar reads as                                       |
| ---------------------- | ---------------------------------------------------- |
| `'none'` (default)     | the aggregated value itself                          |
| `'percent'`            | its share of the total, 0–100                        |
| `'frequency'`          | the same share on a 0–1 scale                        |
| `'density'`            | share ÷ bin width — the bars enclose an area of 1    |
| `'cumulative'`         | the running total from the left                      |
| `'cumulative-percent'` | the running share, ending at 100 — the empirical CDF |

```ts
series: [{ type: 'histogram', xField: 'response', normalize: 'percent' }];
```

`'density'` is the one to reach for when bins differ in width (explicit `bins`)
or when two distributions of different sample sizes are compared — counts would
lie about both. Cumulative bars answer "what share is under this value":

::: chart-example histogram-cumulative

The tooltip of a normalized bar keeps the original aggregate in brackets —
`33.3% (2)`. The label formatter gets both as well: `raw` is the value before
normalization, `count` the number of rows in the bin.

## Splitting by a field

`groupField` turns one distribution into several sharing a bin grid — the grid is
built from all the data, so the bars line up and can be read against each other.
Each group gets a colour off the theme palette (or `fills`) and a legend item of
its own; switching one off in the legend takes its rows out of the totals as well:

::: chart-example histogram-grouped

`groupMode` decides how the groups share a bin:

| `groupMode`           | The groups of a bin                                    |
| --------------------- | ------------------------------------------------------ |
| `'stacked'` (default) | pile up — the bin total stays readable                 |
| `'grouped'`           | stand side by side, `groupGap` apart                   |
| `'overlay'`           | all start at zero and are drawn over each other        |
| `'normalized'`        | pile up and scale to 100 per bin — the mix of each bin |

::: chart-example histogram-side-by-side

Overlay is for comparing shapes, and shapes of samples of different sizes are only
comparable group by group — so under overlay a share is a share of its own group,
while every other mode measures against the whole chart. `normalizeWithin: 'total' | 'group'`
overrides that either way:

::: chart-example histogram-overlay

`'normalized'` answers the other question — what each duration band is made of:

::: chart-example histogram-normalized

## Binning outside the chart

The chart's own binning is exported, so a click handler can filter rows by the very
edges that were drawn instead of recomputing them — the `nice` step rules would
otherwise drift apart from the bars:

```ts
import { binEdges, binIndexOf } from 'grafit-charts';

const options = { binWidth: 25, domain: [0, 300] } as const;
const edges = binEdges(
  rows.map((row) => row.response),
  options,
);
const inBin = rows.filter((row) => binIndexOf(row.response, edges, options) === clickedBin);
```

`binCountFor` answers what a rule (`'auto'`, `'fd'`, …) would pick for a sample.

The tooltip is written about a bin, so `tooltip.renderer` gets the bin rather than a
row — its bounds, the height the bar draws, the aggregate behind it, the row count
and the group:

```ts
tooltip: {
  renderer: ({ x0, x1, count, seriesName }) => `${seriesName}: ${count} between ${x0} and ${x1} ms`,
}
```

## Bin labels

`label` — placements are the same as for bar (`top`, `inner-top`, `center`, …),
`formatter({ value, x0, x1, raw, count, group })`:

::: chart-example histogram-labels

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option             | Type                                               | Default                                 | Description                               |
| ------------------ | -------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| `xField`           | `string`                                           | —                                       | numeric field to bin                      |
| `yField`           | `string`                                           | —                                       | aggregation field (optional)              |
| `aggregation`      | `'count' \| 'sum' \| 'mean'`                       | `count` / `sum`                         | aggregation method (sum with `yField`)    |
| `binCount`         | `number \| BinRule`                                | `'auto'`                                | number of bins, or the rule that picks it |
| `binWidth`         | `number`                                           | —                                       | bin width; wins over `binCount`           |
| `binOrigin`        | `number`                                           | `0`                                     | value the bin grid is aligned to          |
| `nice`             | `boolean`                                          | `true`                                  | round the computed step to 1/2/5×10ⁿ      |
| `binInclusive`     | `'left' \| 'right'`                                | `'left'`                                | which side of a bin owns an edge value    |
| `bins`             | `[number, number][]`                               | —                                       | explicit bin boundaries; wins over all    |
| `domain`           | `[number, number]`                                 | data extent                             | range to bin                              |
| `outliers`         | `'exclude' \| 'clamp'`                             | `'exclude'`                             | values outside `domain`                   |
| `normalize`        | `HistogramNormalize`                               | `'none'`                                | what a bar's height stands for            |
| `normalizeWithin`  | `'total' \| 'group'`                               | `'group'` under overlay, else `'total'` | whose total a share measures against      |
| `groupField`       | `string`                                           | —                                       | field that splits the data into groups    |
| `groupMode`        | `HistogramGroupMode`                               | `'stacked'`                             | how the groups share a bin                |
| `fills`            | `ColorValue[]`                                     | theme palette                           | colours of the groups                     |
| `groupGap`         | `Fraction`                                         | `0`                                     | gap between side-by-side bars of a bin    |
| `fill`             | styles                                             | palette                                 | bar styling                               |
| `stroke`           | styles                                             | palette                                 | bar styling                               |
| `fillOpacity`      | styles                                             | palette                                 | bar styling                               |
| `strokeWidth`      | styles                                             | `1`                                     | bin stroke width                          |
| `label.enabled`    | `boolean`                                          | `false`                                 | show value labels                         |
| `label.placement`  | outer/`center`/`inner-*` (17 placements)           | `'top'`                                 | label placement                           |
| `label.formatter`  | `({ value, x0, x1, raw, count, group }) => string` | value                                   | label content                             |
| `tooltip.renderer` | `(params: HistogramTooltipRendererParams) => …`    | —                                       | tooltip written about the bin             |
| `label.fontSize`   | `Pixels`                                           | `11`                                    | label font size                           |
| `label.fontWeight` | `string \| number`                                 | `normal`                                | font weight                               |
| `label.fontFamily` | `string`                                           | theme font                              | font family                               |
| `label.color`      | `ColorValue`                                       | foreground; inside — auto contrast      | text color                                |
