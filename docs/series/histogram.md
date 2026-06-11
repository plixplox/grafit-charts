# Histogram

Distribution of a numeric field across bins. `xField` is a numeric field; without `yField`, the number of records is counted.

::: chart-example histogram-basic

## Bin count

`binCount` controls the granularity (or set bin boundaries explicitly via `bins`):

::: chart-example histogram-bins

## Bin labels

`label` — placements are the same as for bar (`top`, `inner-top`, `center`, …),
`formatter({ value, x0, x1 })`:

::: chart-example histogram-labels

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option             | Type                                       | Default                            | Description                              |
| ------------------ | ------------------------------------------ | ---------------------------------- | ---------------------------------------- |
| `xField`           | `string`                                   | —                                  | numeric field to bin                     |
| `yField`           | `string`                                   | —                                  | aggregation field (optional)             |
| `aggregation`      | `'count' \| 'sum' \| 'mean'`               | `count` / `sum`                    | aggregation method (sum with `yField`)   |
| `binCount`         | `number`                                   | `10`                               | number of bins                           |
| `bins`             | `[number, number][]`                       | —                                  | explicit bin boundaries                  |
| `fill`             | styles                                     | palette                            | bar styling                              |
| `stroke`           | styles                                     | palette                            | bar styling                              |
| `fillOpacity`      | styles                                     | palette                            | bar styling                              |
| `strokeWidth`      | styles                                     | `1`                                | bin stroke width                         |
| `label.enabled`    | `boolean`                                  | `false`                            | show value labels                        |
| `label.placement`  | outer/`center`/`inner-*` (17 placements)   | `'top'`                            | label placement                          |
| `label.formatter`  | `({ value, x0, x1 }) => string`            | value                              | label content                            |
| `label.fontSize`   | `Pixels`                                   | `11`                               | label font size                          |
| `label.fontWeight` | `string \| number`                         | `normal`                           | font weight                              |
| `label.fontFamily` | `string`                                   | theme font                         | font family                              |
| `label.color`      | `ColorValue`                               | foreground; inside — auto contrast | text color                               |
