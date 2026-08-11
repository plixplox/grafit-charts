# Scatter

Scatter series; both axes are numeric by default (without `axes`, `number` + `number` axes are created).

::: chart-example scatter-basic

## Point labels

A point label is the name of the point and its value, drawn as one block — the
same label a pie sector or a funnel stage gets. `labelField` is what gives a
point a name; without it the label is the bare value, as it always was.
`layout` puts the value behind a separator (`'inline'`, the default) or on a
line of its own, and each half carries its own font:

```js
labelField: 'country',
label: { enabled: true, category: { fontWeight: 'bold' }, value: { type: 'percent' } },
```

The point name is a field value, so how it becomes text is a property of the
series: `labelName` (`format` or `formatter`) spells it out for the tooltip
heading and the label alike, and `label.category` overrides it where the label
wants something shorter.

`value.type: 'percent'` reads the number as a share of the total — of the y
values for a scatter, of `sizeField` for a bubble, which is what a bubble is
actually a part of. `label.formatter({ value, datum })` still speaks for the
whole label when one text is all you want; it wins over `category`/`value`:

::: chart-example scatter-labels

### Crowded points

`label.minShare` leaves the points below that share of the total unlabelled, and
`label.avoidOverlap` drops the labels there is no room left for. A bubble hands
out the room by size — the big bubbles keep their labels and the specks lose
theirs; a scatter has no size to rank by, so there the earlier point wins:

::: chart-example bubble-crowded

## Marker shapes

`shape`: circle, square, diamond, triangle, cross, plus:

::: chart-example scatter-shapes

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                     | Type                                                 | Default                            | Description                                                      |
| -------------------------- | ---------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `xField`                   | `string`                                             | —                                  | numeric data keys                                                |
| `yField`                   | `string`                                             | —                                  | numeric data keys                                                |
| `labelField`               | `string`                                             | —                                  | data key of the point name (label and tooltip heading)           |
| `labelName.format`         | `string`                                             | —                                  | how the point-name field becomes text: tooltip heading and label |
| `labelName.formatter`      | `({ datum, value }) => string`                       | —                                  | the same, when a format string cannot express it                 |
| `xName`                    | `string`                                             | `xField`                           | x value name in the tooltip                                      |
| `yName`                    | `string`                                             | `yField`                           | y value name in the tooltip                                      |
| `shape`                    | `MarkerShape`                                        | `'circle'`                         | marker shape                                                     |
| `size`                     | `Pixels`                                             | `8`                                | marker size                                                      |
| `fill`                     | `ColorValue`                                         | palette                            | fill                                                             |
| `fillOpacity`              | `Fraction`                                           | `0.85`                             | fill                                                             |
| `stroke`                   | `ColorValue`                                         | background                         | stroke                                                           |
| `strokeWidth`              | `Pixels`                                             | `1`                                | stroke                                                           |
| `itemStyler`               | `(params) => style`                                  | —                                  | per-point styles (fill/stroke/size) based on `datum`             |
| `label.enabled`            | `boolean`                                            | `false`                            | show value labels                                                |
| `label.placement`          | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                            | label placement                                                  |
| `label.formatter`          | `({ value, datum }) => string`                       | —                                  | the whole label at once; wins over category/value                |
| `label.layout`             | `'inline' \| 'stacked'`                              | `'inline'`                         | the value behind a separator or on its own line                  |
| `label.separator`          | `string`                                             | `' · '`                            | what separates the halves of an inline label                     |
| `label.category.enabled`   | `boolean`                                            | `true` when `labelField` is set    | the point name as part of the label                              |
| `label.category.format`    | `string`                                             | —                                  | format string for the name field                                 |
| `label.category.formatter` | `({ datum, label, value, share }) => …`              | —                                  | text of the name half                                            |
| `label.category.*`         | `FontOptions`                                        | the label font                     | font of the name                                                 |
| `label.value.enabled`      | `boolean`                                            | `true`                             | the value as part of the label                                   |
| `label.value.type`         | `'value' \| 'percent'`                               | `'value'`                          | the value itself or its share of the total                       |
| `label.value.format`       | `string`                                             | —                                  | format string (`',.0f'`, `'.1%'`)                                |
| `label.value.formatter`    | `({ datum, label, value, share }) => …`              | —                                  | text of the value half                                           |
| `label.value.*`            | `FontOptions`                                        | the label font                     | font of the value                                                |
| `label.minShare`           | `Fraction`                                           | `0`                                | share of the total a point needs before it is worth a label      |
| `label.avoidOverlap`       | `boolean`                                            | `false`                            | drop the labels there is no room for                             |
| `label.fontSize`           | `Pixels`                                             | `11`                               | label font size                                                  |
| `label.fontWeight`         | `string \| number`                                   | `normal`                           | font weight                                                      |
| `label.fontFamily`         | `string`                                             | theme font                         | font family                                                      |
| `label.color`              | `ColorValue`                                         | foreground; inside — auto contrast | text color                                                       |

`itemStyler` receives `{ datum, index, highlighted, fill, stroke, size }` and returns partial styles —
this is how you color points conditionally without separate series.

## Tooltip

Both axes of a point series are measures, so the default tooltip lists the values as labelled rows:
`xName: x`, `yName: y`. The heading names the point when `labelField` gives it a name, and the series
(marker + `name`) otherwise. A bubble adds `sizeName: size` with its share of the total size —
`Population, M: 1412 (37%)` — the way a pie sector reads its share.
