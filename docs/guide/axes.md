# Axes

Axis types: `category` (bands), `number`, `time`, `log`. Binding is by
`position`: `bottom`/`top` — the X axis, `left`/`right` — the Y axis.

## Time axis

`time` accepts a `Date`, a timestamp or an ISO string; ticks snap to calendar
boundaries, and the label format depends on the step (hours → days → months →
years).

::: chart-example axis-time

## Logarithmic axis

`log` — for data growing by orders of magnitude; ticks at powers of `base`
(10 by default).

::: chart-example axis-log

## Hierarchical categories

`grouped-category`: data values are `[group, item]` arrays; a row of groups
with separators appears below the item labels:

::: chart-example axis-grouped

## CrossLines

Reference lines and ranges in axis coordinates — with labels:

::: chart-example axis-crosslines

## Axis options

| Block      | Options                            |
| ---------- | ---------------------------------- |
| number/log | `min`, `max`, `nice`, `base` (log) |
| time       | `min`, `max` (Date/timestamp)      |
| category   | `paddingInner`, `paddingOuter`     |

### Full option list

| Option                                                    | Type                                                                                 | Default                     | Description                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------- | -------------------------------------------- |
| `type`                                                    | `'number' \| 'category' \| 'time' \| 'log' \| 'ordinal-time' \| 'grouped-category'` | based on series             | axis type                                    |
| `position`                                                | `'bottom' \| 'left' \| 'top' \| 'right'`                                            | based on type               | axis side                                    |
| `title.enabled`                                           | `boolean`                                                                           | `true` when `text` is set   | axis title                                   |
| `title.text`                                              | `string`                                                                            | —                           | title text                                   |
| `title.fontSize`                                          | `Pixels`                                                                         | `12`                        | title font size                              |
| `title.color`                                             | `ColorValue`                                                                          | foreground                  | title color                                  |
| `line.enabled`                                            | `boolean`                                                                           | `true` (heatmap — off)      | axis line                                    |
| `line.stroke`                                             | `ColorValue`                                                                          | theme muted                 | line color                                   |
| `line.width`                                              | `Pixels`                                                                         | `1`                         | line width                                   |
| `tick.enabled`                                            | `boolean`                                                                           | `true` (heatmap — off)      | ticks                                        |
| `tick.size`                                               | `Pixels`                                                                         | `6`                         | tick length                                  |
| `tick.width`                                              | `Pixels`                                                                         | `1`                         | tick width                                   |
| `tick.stroke`                                             | `ColorValue`                                                                          | theme muted                 | tick color                                   |
| `label.enabled`                                           | `boolean`                                                                           | `true`                      | tick labels                                  |
| `label.fontSize`                                          | `Pixels`                                                                         | `11`                        | label font size                              |
| `label.fontFamily`                                        | `string`                                                                            | theme font                  | typeface                                     |
| `label.color`                                             | `ColorValue`                                                                          | theme muted                 | label color                                  |
| `label.spacing`                                           | `Pixels`                                                                         | `4`                         | gap between label and tick                   |
| `label.format`                                            | `string`                                                                            | —                           | format string (`',.2f'`, `'.0%'`, `'%d %b'`) |
| `label.formatter`                                         | `({ value, index }) => string`                                                      | —                           | programmatic formatting                      |
| `label.avoidCollisions`                                   | `boolean`                                                                           | `true`                      | skip overlapping labels                      |
| `gridLine.enabled`                                        | `boolean`                                                                           | `true` (heatmap — off)      | grid lines                                   |
| `gridLine.stroke`                                         | `ColorValue`                                                                          | theme grid                  | grid color                                   |
| `gridLine.width`                                          | `Pixels`                                                                         | `1`                         | width                                        |
| `gridLine.lineDash`                                       | `Pixels[]`                                                                       | —                           | grid dash pattern                            |
| `interval.values`                                         | `unknown[]`                                                                         | auto                        | explicit tick values                         |
| `interval.minSpacing`                                     | `Pixels`                                                                         | `8`                         | minimum label spacing                        |
| `crossLines[].type`                                       | `'line' \| 'range'`                                                                 | `'line'`                    | line or range                                |
| `crossLines[].value`                                      | value                                                                               | —                           | line coordinate                              |
| `crossLines[].range`                                      | `[from, to]`                                                                        | —                           | fill range                                   |
| `crossLines[].stroke`                                     | `ColorValue`                                                                          | theme muted                 | line color                                   |
| `crossLines[].strokeWidth`                                | `Pixels`                                                                         | `1`                         | line width                                   |
| `crossLines[].lineDash`                                   | `Pixels[]`                                                                       | —                           | dash pattern                                 |
| `crossLines[].fill`                                       | `ColorValue`                                                                          | theme muted                 | range fill                                   |
| `crossLines[].fillOpacity`                                | `Fraction`                                                                             | `0.12`                      | fill opacity                                 |
| `crossLines[].label.text`                                 | `string`                                                                            | —                           | label text                                   |
| `crossLines[].label.color`                                | `ColorValue`                                                                          | theme muted                 | label color                                  |
| `crossLines[].label.fontSize`                             | `Pixels`                                                                         | `11`                        | label font size                              |
| `min` (number, log)                                       | `number`                                                                            | data domain                 | lower bound                                  |
| `max` (number, log)                                       | `number`                                                                            | data domain                 | upper bound                                  |
| `nice (number)`                                           | `boolean`                                                                           | `true`                      | round the domain to “nice” bounds            |
| `base (log)`                                              | `number`                                                                            | `10`                        | logarithm base                               |
| `paddingInner` (category, grouped-category)               | `Fraction`                                                                             | `0.2` (ordinal-time `0.25`) | inner band padding                           |
| `paddingOuter` (category, ordinal-time, grouped-category) | `Fraction`                                                                             | `0.1`                       | outer band padding                           |

Horizontal axis labels are automatically thinned out when crowded
(`label.avoidCollisions: false` disables this).

## Overlays

The “no data” and “loading” states are enabled by default: empty `data` shows
`overlays.noData.text`, and `loading: true` shows `overlays.loading.text`.
