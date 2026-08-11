# Area

The area under a line; filled from zero (or from the previous series in a stack).

::: chart-example area-basic

## Value labels

`label` — same as for line: placement top/bottom/left/right, `formatter`, font:

::: chart-example area-labels

## Stacking

`stacked: true` stacks areas on top of each other; the order of series in the array is the bottom-to-top order.

::: chart-example area-stacked

## Overlapping areas

Without stacking, with `fillOpacity` configured:

::: chart-example area-overlap

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option               | Type                                     | Default                               | Description                                        |
| -------------------- | ---------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| `xField`             | `string`                                 | —                                     | data keys                                          |
| `yField`             | `string`                                 | —                                     | data keys                                          |
| `fill`               | `ColorValue`                             | palette                               | area fill                                          |
| `fillOpacity`        | `Fraction`                               | `0.35`                                | area fill                                          |
| `stroke`             | `ColorValue`                             | fill color                            | top line                                           |
| `strokeWidth`        | `Pixels`                                 | `2`                                   | top line                                           |
| `lineDash`           | `Pixels[]`                               | —                                     | line dash pattern                                  |
| `normalizedTo`       | `number`                                 | —                                     | normalize the stack total (100 — percentage stack) |
| `stacked`            | `boolean`                                | `false`                               | stacking                                           |
| `stackGroup`         | `string`                                 | `false`                               | stacking                                           |
| `label.enabled`      | `boolean`                                | `false`                               | show value labels                                  |
| `label.placement`    | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`                               | label position                                     |
| `label.formatter`    | `({ value, datum }) => string`           | the value                             | label content                                      |
| `label.fontSize`     | `Pixels`                                 | `11`                                  | label font size                                    |
| `label.fontWeight`   | `string \| number`                       | `normal`                              | font weight                                        |
| `label.fontFamily`   | `string`                                 | theme font                            | font family                                        |
| `label.color`        | `ColorValue`                             | foreground; auto-contrast when inside | text color                                         |
| `marker.enabled`     | `boolean`                                | `false`                               | show markers                                       |
| `marker.shape`       | `MarkerShape`                            | `circle`                              | marker shape                                       |
| `marker.size`        | `Pixels`                                 | `7`                                   | marker size                                        |
| `marker.fill`        | `ColorValue`                             | series color                          | marker fill                                        |
| `marker.stroke`      | `ColorValue`                             | chart background                      | marker stroke                                      |
| `marker.strokeWidth` | `Pixels`                                 | `1.5`                                 | stroke width                                       |
