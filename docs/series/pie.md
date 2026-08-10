# Pie and Donut

Polar share series. `angleField` sets the sector value, `labelField` the name
(legend, sector labels, tooltip).

A sector label is one label made of two parts — the name and the value — each
with its own font and colour. `label.placement` decides where the whole of it
goes: `'outside'` on a callout line, `'inside'` the sector. Inside labels are
haloed in the sector colour and take an automatic contrast colour.

::: chart-example pie-basic

## Spacing and corner rounding for pie

The same `sectorSpacing` and `cornerRadius` also work without a ring:

::: chart-example pie-spacing

## Donut

`innerRadiusRatio` creates a ring; `innerLabels` adds text in the center.

::: chart-example donut-basic

## Rotation, colors, labels inside the sectors

::: chart-example pie-rotation

## Custom tooltip

The series `tooltip.renderer` receives the whole `datum`, so the tooltip can display any fields:

::: chart-example pie-tooltip

## Spacing and corner rounding

`sectorSpacing` is the gap between sectors (px), `cornerRadius` rounds the corners:

::: chart-example donut-spacing

## A long tail of small sectors

A narrow sector is drawn however narrow it gets: the gap `sectorSpacing` asks
for gives way rather than eating the sector it was meant to separate.

Every sector gets a label too, whatever its size — by default the crowded ones
simply overlap. Two options thin them out, and they answer different questions.

`label.minShare` decides which sectors are worth a label at all: below that
share of the total a sector is drawn but left unlabelled. This is what makes a
long tail readable — the numbers that carry the chart get their callout, the
slivers stay in the ring and in the tooltip.

::: chart-example donut-significant

`label.avoidOverlap` decides whether there is room for a label. The labels stack
in rows down each side of the pie, and once a side runs out of rows the
narrowest sectors on it are the ones that lose theirs — no threshold to pick,
but which labels survive depends on the size of the chart.

::: chart-example donut-crowded

The two combine: `minShare` picks the sectors worth labelling, `avoidOverlap`
guarantees that what is left never collides.

## Values in the legend

`legendValue` shows the sector value to the right of the label; the tooltip here is
anchored to the cursor (`tooltip.position.anchorTo: 'pointer'`):

::: chart-example donut-legend-values

## Donut progress

A thin ring + `innerLabels` makes a compact indicator:

::: chart-example donut-progress

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                               | Type                                         | Default                  | Description                                                              |
| ------------------------------------ | -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `angleField`                         | `string`                                     | —                        | sector value (required)                                                   |
| `labelField`                         | `string`                                     | —                        | sector name                                                               |
| `fills`                              | `ColorValue[]`                               | theme palette            | sector colors around the circle                                           |
| `strokes`                            | `ColorValue[]`                               | theme palette            | sector colors around the circle                                           |
| `rotation`                           | `Degrees`                                    | `0`                      | start angle                                                               |
| `outerRadiusRatio`                   | `Fraction`                                   | `0.85`                   | fraction of the available radius used by the chart (labels go in the remaining space) |
| `innerRadiusRatio` (donut)           | `Fraction`                                   | `0.6`                    | inner radius                                                              |
| `angleName`                          | `string`                                     | `angleField` name        | value label in the tooltip                                                |
| `sectorSpacing`                      | `Pixels`                                     | `0`                      | constant-width gap between sectors                                        |
| `cornerRadius`                       | `Pixels`                                     | `0`                      | sector corner rounding                                                    |
| `label.enabled`                      | `boolean`                                    | on with `labelField`     | sector labels                                                             |
| `label.placement`                    | `'outside' \| 'inside'`                      | `'outside'`              | beside the pie on a callout line, or in the sector                        |
| `label.layout`                       | `'stacked' \| 'inline'`                      | `'stacked'`              | the value on its own line under the name, or in a row with it             |
| `label.separator`                    | `string`                                     | `' · '`                  | what separates the parts of an inline label                               |
| `label.positionRatio`                | `Fraction`                                   | `0.7`                    | position along the radius (inside placement)                              |
| `label.minShare`                     | `Fraction`                                   | `0`                      | share of the total a sector needs before it is worth a label              |
| `label.avoidOverlap`                 | `boolean`                                    | `false`                  | drop the labels there is no room for instead of letting them overlap      |
| `label.category.enabled`             | `boolean`                                    | on with `labelField`     | the sector name as part of the label                                      |
| `label.category.fontSize`            | `Pixels`                                     | `11`                     | name font                                                                 |
| `label.category.fontFamily`          | `string`                                     | theme font               | font family                                                               |
| `label.category.fontWeight`          | `string \| number`                           | `normal`                 | font weight                                                               |
| `label.category.color`               | `ColorValue`                                 | foreground / auto contrast | text color                                                              |
| `label.value.enabled`                | `boolean`                                    | `false`                  | the sector value as part of the label                                     |
| `label.value.type`                   | `'percent' \| 'value'`                       | `'percent'`              | share of the total, or the `angleField` value                             |
| `label.value.format`                 | `string`                                     | —                        | format string (`',.2f'`, `'.1%'`)                                         |
| `label.value.formatter`              | `({ datum, label, value, share }) => string` | —                        | full control over the text                                                |
| `label.value.fontSize`               | `Pixels`                                     | `11`                     | value font                                                                |
| `label.value.color`                  | `ColorValue`                                 | foreground / auto contrast | text color                                                              |
| `calloutLine.radial.length`          | `Pixels`                                     | `20`                     | radial segment length                                                     |
| `calloutLine.radial.stroke`          | `ColorValue`                                 | sector color             | radial segment color                                                      |
| `calloutLine.radial.strokeWidth`     | `Pixels`                                     | `1`                      | width                                                                     |
| `calloutLine.horizontal.length`      | `Pixels`                                     | `20`                     | length of the tail toward the label                                       |
| `calloutLine.horizontal.stroke`      | `ColorValue`                                 | same as radial           | tail color                                                                |
| `calloutLine.horizontal.strokeWidth` | `Pixels`                                     | same as radial           | tail width                                                                |
| `legendValue.enabled`                | `boolean`                                    | `false`                  | sector value in the legend                                                |
| `legendValue.formatter`              | `({ datum, label, value, color }) => string` | value                    | value format                                                              |
| `tooltip.renderer`                   | `({ datum, label, value, color }) => …`      | —                        | custom tooltip                                                            |
| `innerLabels[]`                      | `{ text, fontSize?, fontWeight?, color? }`   | —                        | lines in the donut center                                                 |
| `innerCircle.fill`                   | `ColorValue`                                 | —                        | donut center fill                                                         |
| `innerRadiusRatio`                   | `Fraction`                                   | `0.6`                    | donut inner radius                                                        |

Clicking a legend item hides the sector (shares are recalculated); legend items
that do not fit are paginated with arrows.
