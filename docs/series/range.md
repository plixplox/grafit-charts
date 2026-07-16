# Range Bar and Range Area

Range series: instead of `yField`, a `yLowField` / `yHighField` pair.

## Range Area

::: chart-example range-area-basic

## Range Bar

::: chart-example range-bar-basic

### Horizontal range bars

`direction: 'horizontal'` flips the chart: categories move to the vertical axis.

::: chart-example range-bar-horizontal

### Per-bar colour (Gantt)

`fill` accepts a callback `({ low, high, datum, index }) => color` — colour each bar
individually, e.g. a Gantt timeline painted by task status from a single series:

::: chart-example range-bar-gantt

## Range labels

`label.formatter({ low, high, datum })`; placements are the same as for bar — here `center`
inside the bar with auto contrast:

::: chart-example range-labels

## Combining with a mean line

Range-area as the background + line on top, with a shared tooltip:

::: chart-example range-combo

| Option               | Type                         | Description                 |
| -------------------- | ---------------------------- | --------------------------- |
| `yLowField`          | `string`                     | range bounds                |
| `yHighField`         | `string`                     | range bounds                |
| `direction` (bar)    | `'vertical' \| 'horizontal'` | bar direction (`vertical`)  |
| `fill`               | `ColorValue \| (params) => ColorValue` | fill; callback colours per datum |
| `fill`               | styles   | fill              |
| `fillOpacity`        | styles   | fill              |
| `stroke` (area)      | styles   | outline lines     |
| `strokeWidth` (area) | styles   | outline lines     |
| `cornerRadius` (bar) | `Pixels` | corner rounding   |
| `groupGap` (bar)     | `Fraction` | gap between bars of one group (`0.2`) |

### Full list of options

| Option             | Type                                     | Default                            | Description        |
| ------------------ | ---------------------------------------- | ---------------------------------- | ------------------ |
| `label.enabled`    | `boolean`                                | `false`                            | show value labels  |
| `label.placement`  | outer/`center`/`inner-*` (17 placements) | `'top'`                            | label placement    |
| `label.formatter`  | `({ low, high, datum }) => string`       | value                              | label content      |
| `label.fontSize`   | `Pixels`                                 | `11`                               | label font size    |
| `label.fontWeight` | `string \| number`                       | `normal`                           | font weight        |
| `label.fontFamily` | `string`                                 | theme font                         | font family        |
| `label.color`      | `ColorValue`                             | foreground; inside — auto contrast | text color         |

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).
