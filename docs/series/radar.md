# Radar

Categories are spread around the circle (`angleField`), values go along the radius (`radiusField`).
`radar-line` draws an outline, `radar-area` an outline with a fill. The grid is polygonal
(a "spider web"). On hover, the vertex marker smoothly grows and the other series
are dimmed — the same animation as in polar charts.

::: chart-example radar-basic

## Radar-area

Filled profiles with transparency — handy for comparing two outlines:

::: chart-example radar-area

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                     | Type                                                | Default       | Description              |
| -------------------------- | --------------------------------------------------- | ------------- | ------------------------ |
| `angleField`               | `string`                                            | —             | data keys                |
| `radiusField`              | `string`                                            | —             | data keys                |
| `name`                     | `string`                                            | `radiusField` | series name              |
| `stroke`                   | `ColorValue`                                        | palette       | outline                  |
| `strokeWidth`              | `Pixels`                                            | `2`           | outline                  |
| `fillOpacity` (radar-area) | `Fraction`                                          | `0.25`        | fill opacity             |
| `tooltip.renderer`         | `({ datum, label, value, seriesName, color }) => …` | —             | custom tooltip content   |
| `marker.enabled`           | `boolean`                                           | `true`        | vertex markers           |
| `marker.shape`             | `MarkerShape`                                       | `circle`      | shape                    |
| `marker.size`              | `Pixels`                                            | `6`           | size                     |
