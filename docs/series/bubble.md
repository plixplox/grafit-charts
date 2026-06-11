# Bubble

Scatter with a third dimension: `sizeField` controls the marker diameter within the `size…maxSize` range.

::: chart-example bubble-basic

## Labels inside bubbles

In addition to the line placements there is `placement: 'inside'` — text at the center of the bubble
with an auto-contrast color and a halo in the marker's color:

::: chart-example bubble-labels

## Size range

`size`/`maxSize` set the diameters for the minimum and maximum `sizeField` values:

::: chart-example bubble-scaled

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

All [scatter](/series/scatter) options, plus:

| Option             | Type                                                 | Default                              | Description                        |
| ------------------ | ---------------------------------------------------- | ------------------------------------ | ---------------------------------- |
| `sizeField`        | `string`                                             | —                                    | size value key (required)          |
| `sizeName`         | `string`                                             | `sizeField`                          | name in the tooltip                |
| `size`             | `Pixels`                                          | `8`                                  | diameter for the minimum value     |
| `maxSize`          | `Pixels`                                          | `28`                                 | diameter for the maximum value     |
| `shape`            | `MarkerShape`                                        | `circle`                             | marker shape                       |
| `fill`             | styles                                               | palette                              | fill                               |
| `fillOpacity`      | styles                                               | `0.85`                               | fill                               |
| `stroke`           | styles                                               | background                           | marker stroke                      |
| `strokeWidth`      | styles                                               | `1`                                  | marker stroke                      |
| `itemStyler`       | `(params) => MarkerItemStyle`                        | —                                    | per-point styles                   |
| `label.enabled`    | `boolean`                                            | `false`                              | show value labels                  |
| `label.placement`  | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                              | label position                     |
| `label.formatter`  | `({ value, datum }) => string`                       | the value                            | label content                      |
| `label.fontSize`   | `Pixels`                                          | `11`                                 | label font size                    |
| `label.fontWeight` | `string \| number`                                   | `normal`                             | font weight                        |
| `label.fontFamily` | `string`                                             | theme font                           | font family                        |
| `label.color`      | `ColorValue`                                           | foreground; auto-contrast when inside | text color                         |
