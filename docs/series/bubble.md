# Bubble

Scatter with a third dimension: `sizeField` controls the marker diameter within the `size…maxSize` range.

::: chart-example bubble-basic

## Labels inside bubbles

In addition to the line placements there is `placement: 'inside'` — text at the center of the bubble
with an auto-contrast color and a halo in the marker's color:

::: chart-example bubble-labels

## Which bubbles get a label

A bubble is a part of a whole — `sizeField` is its share of the total — so it
takes the two options a pie sector does. `label.minShare` leaves the specks
unlabelled, `label.avoidOverlap` hands out the room the big bubbles first, and
`label.value.type: 'percent'` reads the size as that share. `labelField` gives
the bubble a name to put beside it:

::: chart-example bubble-crowded

The label itself is the block described in [Scatter](/series/scatter#point-labels):
the name and the value, each with its own font.

## Size range

`size`/`maxSize` set the diameters for the minimum and maximum `sizeField` values:

::: chart-example bubble-scaled

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

All [scatter](/series/scatter) options, plus:

| Option               | Type                                                 | Default                               | Description                                                             |
| -------------------- | ---------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| `sizeField`          | `string`                                             | —                                     | size value key (required)                                               |
| `sizeName`           | `string`                                             | `sizeField`                           | name in the tooltip; the row reads the size with its share of the total |
| `labelField`         | `string`                                             | —                                     | data key of the bubble name                                             |
| `size`               | `Pixels`                                             | `8`                                   | diameter for the minimum value                                          |
| `maxSize`            | `Pixels`                                             | `28`                                  | diameter for the maximum value                                          |
| `shape`              | `MarkerShape`                                        | `circle`                              | marker shape                                                            |
| `fill`               | styles                                               | palette                               | fill                                                                    |
| `fillOpacity`        | styles                                               | `0.85`                                | fill                                                                    |
| `stroke`             | styles                                               | background                            | marker stroke                                                           |
| `strokeWidth`        | styles                                               | `1`                                   | marker stroke                                                           |
| `itemStyler`         | `(params) => MarkerItemStyle`                        | —                                     | per-point styles                                                        |
| `label.enabled`      | `boolean`                                            | `false`                               | show value labels                                                       |
| `label.placement`    | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                               | label position                                                          |
| `label.formatter`    | `({ value, datum }) => string`                       | —                                     | the whole label at once                                                 |
| `label.minShare`     | `Fraction`                                           | `0`                                   | share of the total size a bubble needs before it is worth a label       |
| `label.avoidOverlap` | `boolean`                                            | `false`                               | drop the labels there is no room for; the big bubbles ask first         |
| `label.fontSize`     | `Pixels`                                             | `11`                                  | label font size                                                         |
| `label.fontWeight`   | `string \| number`                                   | `normal`                              | font weight                                                             |
| `label.fontFamily`   | `string`                                             | theme font                            | font family                                                             |
| `label.color`        | `ColorValue`                                         | foreground; auto-contrast when inside | text color                                                              |
