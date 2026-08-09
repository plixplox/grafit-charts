# Heatmap

Categories on both axes; the `colorField` value sets the cell color on a continuous scale.
A gradient legend automatically appears on the right.

By default, heatmap axes are drawn without lines, ticks, or grid — only the
category labels remain (bring them back via `axes: [{ ..., line: { enabled: true } }]`).

::: chart-example heatmap-basic

## Color scale placement

`gradientLegend` controls the scale's position, spacing, thickness, and the labels of its ends
(in a [grafit-charts/core](/guide/bundle) build the scale is a separate module:
`register(gradientLegendModule)`):

::: chart-example heatmap-legend-bottom

| Option                           | Type                    | Default   | Description                 |
| -------------------------------- | ----------------------- | --------- | --------------------------- |
| `gradientLegend.enabled`         | `boolean`               | `true`    | show the scale              |
| `gradientLegend.position`        | `'top' \| 'right' \| 'bottom' \| 'left'` | `'right'` | placement side  |
| `gradientLegend.spacing`         | `Pixels`                | `10`      | gap from the plot area      |
| `gradientLegend.thickness`       | `Pixels`                | `12`      | bar thickness               |
| `gradientLegend.label.enabled`   | `boolean`               | `true`    | label the ends of the scale |
| `gradientLegend.label.format`    | `string`                | —         | format string (`',.2f'`)    |
| `gradientLegend.label.formatter` | `({ value }) => string` | the value | text of an end label        |

A scale beside the plot (`'left'`, `'right'`) is a vertical bar with its ends above and
below it; one over or under the plot (`'top'`, `'bottom'`) is a horizontal bar with the ends
level with it, on either side.

The ends carry the raw minimum and maximum of the data, so a series with a formatted value
passes the same `format` (or `formatter`) here. The strip is as wide as the ends it actually
draws, so shortening them gives the room back to the plot; with `label: { enabled: false }`
it shrinks to the bar itself.

## Value labels

`label: { enabled: true }` shows the value in each cell; the text color
is chosen automatically based on the background luminance. The tooltip here is anchored to the
cell center (`tooltip.position.anchorTo: 'center'`; the default is the top edge):

::: chart-example heatmap-labels

## Custom labels

`formatter`, font, color, and placement (`placement: 'top'`) are configurable; the scale can be disabled:

::: chart-example heatmap-labels-custom

| Option             | Type                                  | Default                              | Description                  |
| ------------------ | --------------------------------- | ------------------------------------ | ---------------------------- |
| `xField`           | `string`                          | —                                    | axis categories              |
| `yField`           | `string`                          | —                                    | axis categories              |
| `colorField`       | `string`                          | —                                    | numeric value → color        |
| `colorRange`       | `ColorValue[]`                      | blue-cyan                            | scale stops (2+)             |
| `itemPadding`      | `Pixels`                       | `2`                                  | gap between cells            |
| `cornerRadius`     | `Pixels`                       | theme (`5`)                          | cell corner rounding         |
| `colorName`        | `string`                          | `colorField` name                    | value label in the tooltip   |
| `label.enabled`    | `boolean`                         | `false`                              | show value labels            |
| `label.placement`  | `center`, edges and corners (9 positions) | `'center'`                   | label position               |
| `label.format`     | `string`                          | —                                    | format string (`',.2f'`); the tooltip reads it too |
| `label.formatter`  | `({ value, datum }) => string`    | the value                            | label content                |
| `label.avoidOverlap` | `boolean`                       | `false`                              | drop a label that runs into one already drawn |
| `label.fontSize`   | `Pixels`                       | `11`                                 | label font size              |
| `label.fontWeight` | `string \| number`                | `normal`                             | font weight                  |
| `label.fontFamily` | `string`                          | theme font                           | font family                  |
| `label.color`      | `ColorValue`                        | foreground; auto-contrast when inside | text color                   |

## Options

Options common to all series (`name`, `showInLegend`, …) are covered in [Common series options](/guide/series-options).
The heatmap tooltip has both categories to name, so its renderer is handed those instead of x/y:

| Option             | Type                                                | Default | Description    |
| ------------------ | --------------------------------------------------- | ------- | -------------- |
| `tooltip.renderer` | `({ datum, value, xValue, yValue, color }) => …`     | —       | custom tooltip |
