# Axes

Axis types: `category` (bands), `number`, `time`, `log`. Binding is by
`position`: `bottom`/`top` — the X axis, `left`/`right` — the Y axis.

## Default look

Out of the box axes stay quiet, and the two directions split the work: the
category axis keeps its line and has no grid, the value axis drops its line and
is read off a dashed grid instead. Ticks are off on both. In a horizontal chart
the value axis is the horizontal one, so the dashes turn vertical along with it.

All of this chrome is light grey — the `axisColor` theme token, overridable per
axis through `line.stroke`, `tick.stroke` and `gridLine.stroke`. The defaults sit
underneath your options, so anything comes back on request:
`tick: { enabled: true }`, `line: { enabled: true }`,
`gridLine: { enabled: true, lineDash: [] }` for a solid grid along the
categories.

## Line, ticks and grid

The axis line takes the same three style options as the grid — colour, width and
dash pattern — and the ticks take their length and colour beside them:

```js
axes: [
  {
    position: 'bottom',
    line: { stroke: '#0f766e', width: 2, lineDash: [6, 3] },
    tick: { enabled: true, size: 10, width: 2, color: '#0f766e' },
    gridLine: { stroke: '#e2e8f0', width: 1, lineDash: [2, 4] },
  },
],
```

`line.lineDash` and `gridLine.lineDash` read like the CSS-side dash arrays:
`[on, off]` in pixels, and an empty array `[]` draws a solid line even when the
theme dashes it. `tick.size` is the length of the mark, always drawn outwards
from the plot, and `tick.color` is an alias of `tick.stroke` — either sets the
tick colour and wins over the theme's `tickColor`.

## Two value axes

Quantities of different sizes — euros and per cent, requests and latency —
share a chart badly on one scale: the smaller one flattens into the baseline.
Declare a second value axis on the opposite side, and let each axis say with
`keys` which series it carries:

```js
series: [
  { type: 'bar', xField: 'month', yField: 'revenue', name: 'Revenue' },
  { type: 'line', xField: 'month', yField: 'margin', name: 'Margin' },
],
axes: [
  { type: 'category', position: 'bottom' },
  { type: 'number', position: 'left', keys: ['revenue'], title: { text: 'Revenue, k€' } },
  { type: 'number', position: 'right', keys: ['margin'], title: { text: 'Margin, %' } },
],
```

::: chart-example axis-dual-y

`keys` lists value fields — `yField`, or the low/high and OHLC fields of the
multi-field series — and a series `id` matches too, which is how two series over
one field end up on different axes. Everything unclaimed goes to the first axis
without `keys`, so a chart with a single value axis behaves exactly as before.

Each axis then scales itself to its own series only, and picks its own nice
bounds; hiding a series through the legend rescales its axis alone. The two grids
would never line up, so only the first value axis keeps its grid — turn it on for
the second one with `gridLine: { enabled: true }` if you want both.

The same works in a horizontal chart, where the value axes are `bottom` and
`top`. What still reads off the first value axis: annotations, the crosshair's
value label and the Y zoom window.

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

In horizontal charts the category axis is vertical, and the group column with
separators appears to the left of the item labels:

::: chart-example axis-grouped-horizontal

## Labels always fit

Labels are placed by an anchor: a tick label is centred on its tick, a value
label hangs off its bar. Both therefore reach past the plot rect — by half the
width of the outermost tick label, by the whole width of a label sitting to the
right of the longest bar. The layout measures that reach and takes it off the
plot, so nothing is ever clipped by the edge of the canvas: the plot gives way
to the labels rather than the other way round.

That room is shared with the axis zones instead of being added to them — a label
hanging 12 px over the left edge costs nothing when the Y axis already reserves
40 px there. Which is why the effect only shows up where it is needed: a
percentage axis whose last tick sits on the right edge, a horizontal bar chart
whose value labels follow the bars out.

The area the chart is fitted into is the one left after `padding`, the
title/subtitle and the legend, so your padding stays yours — labels do not creep
into it.

::: chart-example bar-labels

Polar charts are fitted the same way: the grid radius is chosen so that the
category names around the rim stay inside the area, and a long name on one side
only slides the centre across instead of shrinking the whole web. Where the
spokes crowd together, labels that would collide are dropped while the grid
itself stays whole (see [Radar](/series/radar)). For pie and donut, outside
callout labels cap the radius the same way.

## Labels inside the plot

`label.placement: 'inside'` moves the tick labels into the plot area, and the
axis stops reserving space for them. On a vertical category axis every label
sits above its bar: a label row is reserved above the first band, and the gap
between bands grows to fit it — set `paddingInner` explicitly to keep the bar
thickness under your own control. Inside labels are drawn over the series.

An inside label keeps two distances of its own, 4 px each: `label.insideSpacing`
— the indent from the axis into the plot, and `label.insideGap` — the clearance to
its own element and to the one before it (that gap is what sets the reserved row
height). `label.spacing` is for outside labels only and does not reach here.

::: chart-example axis-labels-inside

With `grouped-category` the two levels split up: the group column stays outside
and keeps its own thickness, the item labels move inside above their bars, and
the group separator shifts above the labels.

::: chart-example axis-labels-inside-grouped

On a horizontal axis the labels run along the inner edge of the plot rect, and
on a value axis they sit above their own grid line.

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

| Option                                                    | Type                                                                                | Default                     | Description                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| `type`                                                    | `'number' \| 'category' \| 'time' \| 'log' \| 'ordinal-time' \| 'grouped-category'` | based on series             | axis type                                            |
| `position`                                                | `'bottom' \| 'left' \| 'top' \| 'right'`                                            | based on type               | axis side                                            |
| `title.enabled`                                           | `boolean`                                                                           | `true` when `text` is set   | axis title                                           |
| `title.text`                                              | `string`                                                                            | —                           | title text                                           |
| `title.fontSize`                                          | `Pixels`                                                                            | `12`                        | title font size                                      |
| `title.color`                                             | `ColorValue`                                                                        | foreground                  | title color                                          |
| `line.enabled`                                            | `boolean`                                                                           | category axis only          | axis line                                            |
| `line.stroke`                                             | `ColorValue`                                                                        | theme axis (light grey)     | line color                                           |
| `line.width`                                              | `Pixels`                                                                            | `1`                         | line width                                           |
| `line.lineDash`                                           | `Pixels[]`                                                                          | solid                       | axis line dash pattern (`[]` forces a solid line)    |
| `tick.enabled`                                            | `boolean`                                                                           | `false`                     | ticks                                                |
| `tick.size`                                               | `Pixels`                                                                            | `6`                         | tick length                                          |
| `tick.width`                                              | `Pixels`                                                                            | `1`                         | tick width                                           |
| `tick.stroke`                                             | `ColorValue`                                                                        | theme axis (light grey)     | tick color (`tick.color` is an alias)                |
| `tick.lineDash`                                           | `Pixels[]`                                                                          | solid                       | tick dash pattern                                    |
| `label.enabled`                                           | `boolean`                                                                           | `true`                      | tick labels                                          |
| `label.fontSize`                                          | `Pixels`                                                                            | `11`                        | label font size                                      |
| `label.fontFamily`                                        | `string`                                                                            | theme font                  | typeface                                             |
| `label.color`                                             | `ColorValue`                                                                        | theme muted                 | label color                                          |
| `label.spacing`                                           | `Pixels`                                                                            | `8`                         | outside labels: gap from the tick or the axis        |
| `label.insideSpacing`                                     | `Pixels`                                                                            | `4`                         | inside labels: indent from the axis                  |
| `label.insideAlign`                                       | `'element' \| 'gap'`                                                                | `'element'`                 | inside labels: hug the element or centre in the gap  |
| `label.insideGap`                                         | `Pixels`                                                                            | `4`                         | inside labels: clearance to their element            |
| `label.placement`                                         | `'outside' \| 'inside'`                                                             | `'outside'`                 | labels beside the axis or inside the plot            |
| `label.format`                                            | `string`                                                                            | —                           | format string (`',.2f'`, `'.0%'`, `'%d %b'`)         |
| `label.formatter`                                         | `({ value, index }) => string`                                                      | —                           | programmatic formatting                              |
| `label.avoidCollisions`                                   | `boolean`                                                                           | `true`                      | skip overlapping labels                              |
| `gridLine.enabled`                                        | `boolean`                                                                           | value axis only             | grid lines                                           |
| `gridLine.stroke`                                         | `ColorValue`                                                                        | theme axis (light grey)     | grid color                                           |
| `gridLine.width`                                          | `Pixels`                                                                            | `1`                         | width                                                |
| `gridLine.lineDash`                                       | `Pixels[]`                                                                          | `[4, 4]`                    | grid dash pattern                                    |
| `interval.values`                                         | `unknown[]`                                                                         | auto                        | explicit tick values                                 |
| `interval.minSpacing`                                     | `Pixels`                                                                            | `8`                         | minimum label spacing                                |
| `crossLines[].type`                                       | `'line' \| 'range'`                                                                 | `'line'`                    | line or range                                        |
| `crossLines[].value`                                      | value                                                                               | —                           | line coordinate                                      |
| `crossLines[].range`                                      | `[from, to]`                                                                        | —                           | fill range                                           |
| `crossLines[].stroke`                                     | `ColorValue`                                                                        | theme muted                 | line color                                           |
| `crossLines[].strokeWidth`                                | `Pixels`                                                                            | `1`                         | line width                                           |
| `crossLines[].lineDash`                                   | `Pixels[]`                                                                          | —                           | dash pattern                                         |
| `crossLines[].fill`                                       | `ColorValue`                                                                        | theme muted                 | range fill                                           |
| `crossLines[].fillOpacity`                                | `Fraction`                                                                          | `0.12`                      | fill opacity                                         |
| `crossLines[].label.text`                                 | `string`                                                                            | —                           | label text                                           |
| `crossLines[].label.color`                                | `ColorValue`                                                                        | theme muted                 | label color                                          |
| `crossLines[].label.fontSize`                             | `Pixels`                                                                            | `11`                        | label font size                                      |
| `min` (number, log)                                       | `number`                                                                            | data domain                 | lower bound                                          |
| `max` (number, log)                                       | `number`                                                                            | data domain                 | upper bound                                          |
| `nice (number)`                                           | `boolean`                                                                           | `true`                      | round the domain to “nice” bounds                    |
| `base (log)`                                              | `number`                                                                            | `10`                        | logarithm base                                       |
| `paddingInner` (category, ordinal-time, grouped-category) | `Fraction`                                                                          | `0.2` (ordinal-time `0.25`) | gap between elements, share of the step              |
| `gap` (category, ordinal-time, grouped-category)          | `Pixels`                                                                            | —                           | gap between elements in px; wins over `paddingInner` |
| `paddingOuter` (category, ordinal-time, grouped-category) | `Fraction`                                                                          | `0.1`                       | outer band padding                                   |
| `groupSpacing` (grouped-category)                         | `Pixels`                                                                            | `8`                         | gap between item labels and the group row            |

Horizontal axis labels are automatically thinned out when crowded
(`label.avoidCollisions: false` disables this).

## Overlays

The “no data” and “loading” states are enabled by default: empty `data` shows
`overlays.noData.text`, and `loading: true` shows `overlays.loading.text`.
