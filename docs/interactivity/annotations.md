# Annotations

Declarative marks in data coordinates — drawn on top of the series and
surviving zoom/resize. Interactive drawing is planned for future phases.

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), annotations are a separate module: `register(annotationsModule)`.
:::

::: chart-example annotations-basic

Horizontal and vertical lines can be dragged with the mouse (always enabled).

## Types

| Type              | Fields                                                 | Description                    |
| ----------------- | ------------------------------------------------------ | ------------------------------ |
| `horizontal-line` | `value`, `stroke?`, `lineDash?`, `label?`              | horizontal level               |
| `vertical-line`   | `value` (category/date), …                             | vertical mark                  |
| `line`            | `start: {x, y}`, `end: {x, y}`                         | arbitrary segment (trend line) |
| `text`            | `x`, `y`, `text`, `color?`, `fontSize?`                | label at a data point          |
| `range`           | `axis: 'x' \| 'y'`, `range: [a, b]`, `fill?`, `label?` | filled range                   |

## Values the data decides

A line at "the average" should move when the data does, so `value` also takes the
question instead of the answer — `{ stat, field }`, recomputed on every update:

::: chart-example annotations-stats

```ts
annotations: [
  { type: 'vertical-line', value: { stat: 'median', field: 'response' } },
  {
    type: 'vertical-line',
    value: { stat: 'percentile', percentile: 95, field: 'response' },
    label: { formatter: (value) => `p95 ${Math.round(value)} ms` },
  },
];
```

`stat` is one of `'mean'`, `'median'`, `'min'`, `'max'`, `'sum'`, `'percentile'`
(with `percentile: 0…100`). Both ends of a `range` take the same descriptor, which
is how a band between two percentiles is written:

```ts
{
  type: 'range',
  axis: 'y',
  range: [
    { stat: 'percentile', percentile: 25, field: 'price' },
    { stat: 'percentile', percentile: 75, field: 'price' },
  ],
}
```

`label.formatter` is handed the number the line landed on — that is the point of a
computed level: the label says `p95 208 ms` without anyone typing 208. A computed
line cannot be dragged (it would snap back on the next frame), and a statistic with
no numeric rows behind it leaves its annotation undrawn.

### Full list of options

| Option            | Type                        | Default    | Description                           |
| ----------------- | --------------------------- | ---------- | ------------------------------------- |
| `strokeWidth`     | lines                       | `1`        | annotation line width                 |
| `fillOpacity`     | `range`                     | `0.12`     | range fill opacity                    |
| `label.text`      | `string`                    | —          | line label (horizontal/vertical-line) |
| `label.formatter` | `(value: number) => string` | —          | label built from the line's value     |
| `label.fontSize`  | `Pixels`                    | `11`       | label font size                       |
| `label.color`     | `ColorValue`                | line color | label color                           |

Coordinates are specified as data values: categories/dates for X, numbers for Y.

`horizontal-line` and `vertical-line` can be dragged with the mouse — the value updates
along the scale (categorical lines snap to the nearest category).
