# Line

Line series: `xField` is the category, `yField` is the numeric value.

::: chart-example line-basic

## Multiple lines

Each series is a separate item in the `series` array; colors are assigned from the theme palette in order.

::: chart-example line-multi

## Value labels

`label` renders the value next to each point; `placement` — top/bottom/left/right,
`formatter({ value, datum })` and the font are configurable (a halo in the background
color keeps labels readable on top of grid lines):

::: chart-example line-labels

## Line styles

`lineDash`, line width, marker shapes, and a shared tooltip:

::: chart-example line-styles

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option               | Type                                     | Default                            | Description                    |
| -------------------- | ---------------------------------------- | ---------------------------------- | ------------------------------ |
| `xField`             | `string`                                 | —                                  | data keys (required)           |
| `yField`             | `string`                                 | —                                  | data keys (required)           |
| `xName`              | `string`                                 | `yField`                           | names for legend and tooltip   |
| `name`               | `string`                                 | `yField`                           | names for legend and tooltip   |
| `stroke`             | `ColorValue`                             | theme palette                      | line color                     |
| `strokeWidth`        | `Pixels`                                 | `2`                                | line width                     |
| `lineDash`           | `Pixels[]`                               | —                                  | dash pattern                   |
| `visible`            | `boolean`                                | `true`                             | series visibility              |
| `showInLegend`       | `boolean`                                | `true`                             | legend item                    |
| `tooltip.renderer`   | `function`                               | —                                  | custom tooltip content         |
| `label.enabled`      | `boolean`                                | `false`                            | show value labels              |
| `label.placement`    | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`                            | label placement                |
| `label.formatter`    | `({ value, datum }) => string`           | value                              | label content                  |
| `label.fontSize`     | `Pixels`                                 | `11`                               | label font size                |
| `label.fontWeight`   | `string \| number`                       | `normal`                           | font weight                    |
| `label.fontFamily`   | `string`                                 | theme font                         | font family                    |
| `label.color`        | `ColorValue`                             | foreground; inside — auto contrast | text color                     |
| `marker.enabled`     | `boolean`                                | `true`                             | show markers                   |
| `marker.shape`       | `MarkerShape`                            | `circle`                           | marker shape                   |
| `marker.size`        | `Pixels`                                 | `7`                                | marker size                    |
| `marker.fill`        | `ColorValue`                             | series color                       | marker fill                    |
| `marker.stroke`      | `ColorValue`                             | chart background                   | marker stroke                  |
| `marker.strokeWidth` | `Pixels`                                 | `1.5`                              | stroke width                   |

Points with non-numeric `yField` values break the line (`connectMissingData` is planned for future phases).
