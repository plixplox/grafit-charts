# Scatter

Scatter series; both axes are numeric by default (without `axes`, `number` + `number` axes are created).

::: chart-example scatter-basic

## Value labels

`label.formatter({ value, datum })` — any datum fields can go into the label:

::: chart-example scatter-labels

## Marker shapes

`shape`: circle, square, diamond, triangle, cross, plus:

::: chart-example scatter-shapes

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option             | Type                                                 | Default                            | Description                                          |
| ------------------ | ---------------------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `xField`           | `string`                                             | —                                  | numeric data keys                                    |
| `yField`           | `string`                                             | —                                  | numeric data keys                                    |
| `shape`            | `MarkerShape`                                        | `'circle'`                         | marker shape                                         |
| `size`             | `Pixels`                                             | `8`                                | marker size                                          |
| `fill`             | `ColorValue`                                         | palette                            | fill                                                 |
| `fillOpacity`      | `Fraction`                                           | `0.85`                             | fill                                                 |
| `stroke`           | `ColorValue`                                         | background                         | stroke                                               |
| `strokeWidth`      | `Pixels`                                             | `1`                                | stroke                                               |
| `itemStyler`       | `(params) => style`                                  | —                                  | per-point styles (fill/stroke/size) based on `datum` |
| `label.enabled`    | `boolean`                                            | `false`                            | show value labels                                    |
| `label.placement`  | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                            | label placement                                      |
| `label.formatter`  | `({ value, datum }) => string`                       | value                              | label content                                        |
| `label.fontSize`   | `Pixels`                                             | `11`                               | label font size                                      |
| `label.fontWeight` | `string \| number`                                   | `normal`                           | font weight                                          |
| `label.fontFamily` | `string`                                             | theme font                         | font family                                          |
| `label.color`      | `ColorValue`                                         | foreground; inside — auto contrast | text color                                           |

`itemStyler` receives `{ datum, index, highlighted, fill, stroke, size }` and returns partial styles —
this is how you color points conditionally without separate series.
