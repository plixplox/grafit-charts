# Radar

Categories are spread around the circle (`angleField`), values go along the radius (`radiusField`).
`radar-line` draws an outline, `radar-area` an outline with a fill. The grid is polygonal
(a "spider web"). On hover, the vertex marker smoothly grows and the other series
are dimmed — the same animation as in polar charts.

::: chart-example radar-basic

## Radar-area

Filled profiles with transparency — handy for comparing two outlines:

::: chart-example radar-area

## Long category names

The web is sized after the labels around it, not before: the radius shrinks —
and the centre shifts, when only one side is crowded — until every category name
is inside the chart area. Nothing is cut off at the edge, whatever the aspect
ratio of the container.

::: chart-example radar-long-labels

## Many categories

Once the spokes crowd together, labels start colliding — so the ones that would
run into their neighbour are dropped. Density around a circle is uneven: labels
stack up at the sides, where the spokes are closest in y, and spread out at the
top and bottom, where the text runs sideways. Rather than thin by a fixed step
that would have to obey the worst spot, each label is kept if it has room —
so the sides stay dense and the top thins out.

The spokes and the rings are all drawn either way: the grid stays whole, only
the labels give way. Values on the rings yield to the category names, so the two
never overlap at twelve o'clock.

::: chart-example radar-many-categories

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                     | Type                                                | Default       | Description            |
| -------------------------- | --------------------------------------------------- | ------------- | ---------------------- |
| `angleField`               | `string`                                            | —             | data keys              |
| `radiusField`              | `string`                                            | —             | data keys              |
| `name`                     | `string`                                            | `radiusField` | series name            |
| `stroke`                   | `ColorValue`                                        | palette       | outline                |
| `strokeWidth`              | `Pixels`                                            | `2`           | outline                |
| `fillOpacity` (radar-area) | `Fraction`                                          | `0.25`        | fill opacity           |
| `tooltip.renderer`         | `({ datum, label, value, seriesName, color }) => …` | —             | custom tooltip content |
| `marker.enabled`           | `boolean`                                           | `true`        | vertex markers         |
| `marker.shape`             | `MarkerShape`                                       | `circle`      | shape                  |
| `marker.size`              | `Pixels`                                            | `6`           | size                   |


## Value labels

`label.enabled` prints the value on each vertex. `placement` defaults to
`outward`, which pushes the label away from the centre along its own spoke —
where the web is empty whichever way the vertex leans; `top`, `bottom`, `left`,
`right` and `inside` behave as they do on a line.

::: chart-example radar-labels

| Option             | Type                                                     | Default     | Description        |
| ------------------ | -------------------------------------------------------- | ----------- | ------------------ |
| `label.enabled`    | `boolean`                                                | `false`     | show value labels  |
| `label.placement`  | `'outward' \| 'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'outward'` | where the label sits |
| `label.formatter`  | `({ value, datum }) => string`                           | the value   | label content      |
| `label.fontSize`   | `Pixels`                                                 | `11`        | font size          |
| `label.fontWeight` | `string \| number`                                       | `normal`    | font weight        |
| `label.fontFamily` | `string`                                                 | theme font  | typeface           |
| `label.color`      | `ColorValue`                                             | foreground; `inside` — auto-contrast | text colour |

The rings, the spokes and the numbers beside them belong to the axes rather than
to the series — see [Polar axes](/guide/axes#polar-axes).
