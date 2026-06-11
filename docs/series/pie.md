# Pie and Donut

Polar share series. `angleField` sets the sector value, `labelField` the name
(legend, callout labels, tooltip).

::: chart-example pie-basic

## Spacing and corner rounding for pie

The same `sectorSpacing` and `cornerRadius` also work without a ring:

::: chart-example pie-spacing

## Donut

`innerRadiusRatio` creates a ring; `innerLabels` adds text in the center.

::: chart-example donut-basic

## Rotation, colors, sector labels

::: chart-example pie-rotation

## Custom tooltip

The series `tooltip.renderer` receives the whole `datum`, so the tooltip can display any fields:

::: chart-example pie-tooltip

## Spacing and corner rounding

`sectorSpacing` is the gap between sectors (px), `cornerRadius` rounds the corners:

::: chart-example donut-spacing

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
| `calloutLabel.enabled`               | `boolean`                                    | on with `labelField`     | callout labels                                                            |
| `calloutLabel.fontSize`              | `Pixels`                                     | `11`                     | callout label font                                                        |
| `calloutLabel.fontFamily`            | `string`                                     | theme font               | font family                                                               |
| `calloutLabel.color`                 | `ColorValue`                                 | foreground               | text color                                                                |
| `calloutLine.radial.length`          | `Pixels`                                     | `20`                     | radial segment length                                                     |
| `calloutLine.radial.stroke`          | `ColorValue`                                 | sector color             | radial segment color                                                      |
| `calloutLine.radial.strokeWidth`     | `Pixels`                                     | `1`                      | width                                                                     |
| `calloutLine.horizontal.length`      | `Pixels`                                     | `20`                     | length of the tail toward the label                                       |
| `calloutLine.horizontal.stroke`      | `ColorValue`                                 | same as radial           | tail color                                                                |
| `calloutLine.horizontal.strokeWidth` | `Pixels`                                     | same as radial           | tail width                                                                |
| `sectorLabel.enabled`                | `boolean`                                    | `false`                  | share in % inside the sector                                              |
| `sectorLabel.positionRatio`          | `Fraction`                                   | `0.7`                    | position along the radius                                                 |
| `sectorLabel.fontSize`               | `Pixels`                                     | `11`                     | font                                                                      |
| `sectorLabel.color`                  | `ColorValue`                                 | auto contrast            | color (halo in the sector color)                                          |
| `legendValue.enabled`                | `boolean`                                    | `false`                  | sector value in the legend                                                |
| `legendValue.formatter`              | `({ datum, label, value, color }) => string` | value                    | value format                                                              |
| `tooltip.renderer`                   | `({ datum, label, value, color }) => …`      | —                        | custom tooltip                                                            |
| `innerLabels[]`                      | `{ text, fontSize?, fontWeight?, color? }`   | —                        | lines in the donut center                                                 |
| `innerCircle.fill`                   | `ColorValue`                                 | —                        | donut center fill                                                         |
| `innerRadiusRatio`                   | `Fraction`                                   | `0.6`                    | donut inner radius                                                        |

Clicking a legend item hides the sector (shares are recalculated); legend items
that do not fit are paginated with arrows.
