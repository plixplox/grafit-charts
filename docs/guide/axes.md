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

### Bars on a time axis

Bars, ranges, boxes and candles stand on a `time` axis as readily as on a band
one — the difference is that the axis places them by their real distance apart,
so a month with no data leaves its place empty instead of vanishing:

::: chart-example bar-time

A band axis knows how wide a band is; a continuous one is told. The width comes
from the step of the data — the **smallest** distance between neighbouring
values, measured across every visible series so that grouped bars keep sharing
one band. The smallest rather than the average: months are of unequal length,
and a mean step would have November overlap December.

`bandSpan` overrides it, in axis units — milliseconds on a time axis, so a bar
keeps covering its own period through a zoom, where a width in pixels would not:

```ts
axes: [
  // hourly readings with the odd gap: a bar is an hour wide whatever the gaps say
  { type: 'time', position: 'bottom', bandSpan: 60 * 60 * 1000 },
  { type: 'number', position: 'left' },
];
```

The same option is on the `number` axis, in its own units. A single point says
nothing about a step, so its bar falls back to a tenth of the plot.

Where the dates line up evenly — trading sessions, weeks without weekends — the
`ordinal-time` axis is the other answer: bands of equal width with calendar
labels above them, so the gaps close and nothing is placed by distance.

## Logarithmic axis

`log` — for data growing by orders of magnitude; ticks at powers of `base`
(10 by default).

::: chart-example axis-log

## A step the format can carry

How many ticks a value axis takes is decided by its length — one per 70 px or so
— and the step is then rounded to 1, 2 or 5 × 10ⁿ. A tall chart therefore comes
out finely divided: 200 000 apart over four million, which is fine until the
format is coarser than the step. A compact format without a fraction prints «1M»
for everything from a million to 1.9, so five ticks in a row read the same and
the scale stops saying where a value sits.

So a `number` or `log` axis reads its own labels back before drawing them. Where
neighbours come out identical it keeps every n-th tick instead, for the smallest
n that leaves them different — the step grows to the one the format can carry
(200 000 → a million), and the grid follows the labels rather than outrunning
them:

```ts
axes: [
  { type: 'category', position: 'bottom' },
  {
    type: 'number',
    position: 'left',
    // «1M» from 1.0 to 1.9: the axis settles on whole millions by itself
    label: { formatter: ({ value }) => Intl.NumberFormat('en', { notation: 'compact' }).format(Number(value)) },
  },
];
```

Values listed in `interval.values` are left as they are — those are the ticks
you asked for — and so is an axis with `label.avoidCollisions: false`. To keep
the fine step instead, give the format the precision to match it
(`maximumFractionDigits: 1`); the axis only steps back when the labels leave it
no choice. Category axes are untouched: two rows may honestly share a name.

## Hierarchical categories

`grouped-category`: data values are `[group, item]` arrays (deeper tuples are
fine too); a row of groups with separators appears below the item labels:

::: chart-example axis-grouped

In horizontal charts the category axis is vertical, and the group column with
separators appears to the left of the item labels:

::: chart-example axis-grouped-horizontal

### As many rows as the tuple has levels

The tuple is not limited to two: every element but the last gets a row of its
own. `['2024', 1, 'Q1']` labels the ticks with quarters, puts the halves in a
row above them and the years in a row above those — the outermost level furthest
from the plot, the way a pivot table stacks its headers. A separator belongs to
the outermost level that has it, so a year boundary is drawn once, running the
full depth of the rows.

Groups are runs of neighbouring categories with **equal values**, not with equal
text: `null` and `'null'`, `1` and `'1'` stay two groups the same way they are
two categories. Two `Date` objects standing for the same moment are one group.

::: chart-example axis-grouped-levels

### Styling and formatting the group rows

The rows have their own block of options, `groupLabel` — font, colour and format
of their own, because a group name answers a different question than the tick
under it. Its formatter is handed the raw value of its own level, the row number
and the run of categories the group covers; a group has no tick index, it stands
over a range of them:

```js
axes: [
  {
    type: 'grouped-category',
    groupLabel: {
      fontSize: 12,
      color: '#334155',
      // level 0 is the outermost row
      formatter: ({ value, level }) => (level === 0 ? `FY ${value}` : `H${value}`),
    },
  },
];
```

`groupLabel.format` is the serializable half of the same thing (`'%b %Y'`,
`',.0f'`), applied to the level value. Without either, a group prints the way a
tick number does — millions and thousands shortened.

`label.formatter` stays with the item labels: it is handed the whole tuple and a
tick index, so the two rows keep formatting for their own question.
`groupLabel: { enabled: false }` drops the rows altogether — the item labels
stay, and the axis stops reserving room for groups.

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

## Labels that do not fit

A horizontal axis has one step of room per label. When the names are longer than
that, the default is to thin them out: every other label — or every third —
is dropped, and the ones left are drawn whole. That reads well for dates and
numbers, where the ones in between can be inferred; it reads badly for
categories, where a missing name is a missing category.

A `grouped-category` axis thins run by run instead of across the axis as a
whole: each run of categories keeps as many labels as fit between its own
separators, taken from its middle outwards, so a name never sits under the group
next door. A run too narrow for a label of its own is left to its group name.

`label.overflow: 'ellipsis'` chooses the other trade: every label stays on the
axis and is cut to the room between two ticks, with `label.ellipsis` — `'..'` by
default, `'…'` if you prefer — standing where the text was cut. Nothing then
runs into its neighbour or into the tick line between them.

::: chart-example axis-labels-ellipsis

On a `grouped-category` axis the group rows follow the same rule: a name is held
to the run of categories it stands over, so it stops short of the separators on
either side. `groupLabel.maxWidth` caps it further, `label.ellipsis` supplies its
mark; a name the cut would eat down to the mark alone is dropped instead. Group
names live inside their runs the same way labels do: a name wider than the run it
stands over goes, rather than reaching over the separator into its neighbour.

`label.maxWidth` is the cap on its own — it applies whether or not the axis is
crowded, and on a vertical axis it also decides how much of the canvas the
labels may take from the plot: long category names on the left stop pushing the
plot to the right once they are cut.

```js
axes: [
  { type: 'category', position: 'bottom', label: { overflow: 'ellipsis' } },
  // a left axis has no step to fit into: the cap is what bounds the names
  { type: 'category', position: 'left', label: { maxWidth: 90, ellipsis: '…' } },
];
```

## Labels at an angle

The third trade is to turn the labels. `label.rotation` is the tilt in degrees,
clockwise: `-45` on a bottom axis slants the names up to the right, each one
ending at its own tick; `45` slants them the other way; `-90` stands them on
end. Every name stays whole, and none of them is dropped. `'auto'` leaves the
angle to the axis — see [Letting the axis pick the angle](#letting-the-axis-pick-the-angle).

::: chart-example axis-labels-rotated

Tilted labels lie in parallel strips, so what decides whether two of them
collide is not how long they are but how far apart the ticks stand: they clear
each other as soon as a line of text fits between the strips — about 15 px at
45°, 11 px on end — whatever the names say. That is why a tilt keeps labels a
level axis would have to thin out.

The room the turned text asks for is reserved: the axis grows by the depth of
the tilted row, and where the first or last name leans past the end of the plot
the layout finds that room too, the same way it does for a level label. A tilt
therefore costs height rather than names — `-90` costs the most, the full length
of the longest label, and shallow angles the least. Cap it with `label.maxWidth`
where a single long name would take more than it is worth.

```ts
axes: [
  // eight city names on one axis, none of them dropped and none of them cut
  { type: 'category', position: 'bottom', label: { rotation: -45 } },
  { type: 'number', position: 'left' },
];
```

### Letting the axis pick the angle

`label.rotation: 'auto'` leaves the decision to the axis. The labels stand level
while they all fit that way, and the moment one of them would have to be dropped
they tilt — as gently as the step allows: 30° where a name has 30 px of step to
clear, then 45°, 60°, and on end where the ticks stand closer than that. A chart
whose data grows through the day therefore keeps its labels level until it no
longer can, and turns them only as far as it must.

::: chart-example axis-labels-rotated-auto

The angle is settled once per render and holds for that render: the room a tilt
asks for at the ends of the axis is what moves the plot, and an axis answering
its own new step with a gentler angle again would settle on neither. New data,
or a new size, is decided afresh.

`'auto'` steps aside where the axis has already been given an answer to
crowding: `label.overflow: 'ellipsis'` cuts the labels instead, and
`label.avoidCollisions: false` says to leave them where they are. Both keep the
labels level. A vertical axis reads its labels across itself, one line each, so
they never crowd and `'auto'` leaves them alone as well.

The tilt is for labels beside the axis: `label.placement: 'inside'` draws them
level, in the plot, as it always does. `label.overflow: 'ellipsis'` has nothing
to cut a tilted label to either — a tilted label has no neighbour to run into —
so `maxWidth` is what bounds it.

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

## Polar axes

A radar, a rose or a radial bar chart is drawn on a web, and the web says the
same things a pair of cartesian axes says: these are the categories, these are
the values. It takes its settings as a pair rather than as a list — `angle` for
the categories around the rim, `radius` for the value rings:

```js
axes: {
  angle: { title: { text: 'Month' }, gridLine: { lineDash: [3, 3] }, line: { stroke: '#64748b' } },
  radius: { title: { text: 'Incidents' }, min: 0, max: 60, ringCount: 3, label: { format: ',.0f' } },
},
```

::: chart-example polar-axes

The grid inside the web and the outlines around it are two different things, and
they take two different settings. `angle.gridLine` is the spokes and
`radius.gridLine` the rings — chrome, so they read as the theme's grid does:
dashed, faint, behind the data. The outlines are `angle.line`, the rim that
closes the web, and `radius.line`, the vertical the ring values are read along —
each with its own stroke, width and dash, both solid and both there by default,
wherever the theme keeps axis lines. The outermost ring gives way to the rim, so
the two never stroke the same circle. An empty `lineDash` draws a solid grid line
where the theme dashes it, and `enabled: false` takes any of the four away.

The value scale is labelled from the centre outwards, the centre included —
that is where the scale begins, whether the floor is zero or a `min` the options
set. Labels take a `format` or a `formatter`, and the titles stand outside the
chart: the category one under it, the value one along the left edge. The room
they take is gone before the grid is fitted, so a title never covers a label.

The radial-bar chart inverts the layout — its categories are the rings and its
values are the spokes — but the options follow the meaning rather than the
shape: `angle` still settles the categories, `radius` still settles the values.
Its bars sweep part of the circle rather than all of it, so there the rim is a
decision — `angle.line: { enabled: true }` draws it — while `radius.line` is the
line the bars stand on, there by default as everywhere else.

| Option               | Type                                                | Default       | Description                            |
| -------------------- | --------------------------------------------------- | ------------- | -------------------------------------- |
| `angle.gridLine`     | `enabled`, `stroke`, `width`, `lineDash`, `opacity` | theme, dashed | the spokes                             |
| `angle.line`         | `enabled`, `stroke`, `width`, `lineDash`            | on (rim)      | the rim around the web                 |
| `angle.label`        | `enabled`, font, `format`, `formatter`              | on            | the category names                     |
| `angle.title`        | `enabled`, `text`, font                             | —             | title under the chart                  |
| `radius.gridLine`    | as above                                            | theme, dashed | the rings                              |
| `radius.line`        | as above                                            | on            | the vertical the values are read along |
| `radius.label`       | `enabled`, font, `format`, `formatter`              | on            | the ring values                        |
| `radius.title`       | `enabled`, `text`, font                             | —             | title along the left edge              |
| `radius.min` / `max` | `number`                                            | from the data | bounds of the value scale              |
| `radius.nice`        | `boolean`                                           | `true`        | round the bounds out to whole steps    |
| `radius.ringCount`   | `number`                                            | `4`           | how many rings the values are read off |

### Every option at once

The whole table spelled out, with every option set away from what it would
default to — the same block on a rose and on a radar. Nothing in it is about the
shape of the web: the rings come out as circles on one and as polygons on the
other because of the series, not the axes.

::: chart-example polar-axes-full

::: chart-example radar-axes-full

Worth reading off the pair: `nice: false` keeps `max` exactly where it was put,
so the outermost ring stops short of the rim on the rose and lands on it on the
radar — where it does land, the rim keeps the line and the ring gives way.
`format` on one axis and `formatter` on the other; a formatter wins over a
format string wherever both are given.

## Axis options

| Block                    | Options                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| number/log               | `min`, `max`, `nice`, `base` (log), `bandSpan` (number)                        |
| time                     | `min`, `max` (Date/timestamp), `bandSpan` (ms)                                 |
| category                 | `paddingInner`, `paddingOuter`                                                 |
| polar `angle` / `radius` | see [Polar axes](#polar-axes); `radius` adds `min`, `max`, `nice`, `ringCount` |

### Full option list

| Option                                                    | Type                                                                                | Default                     | Description                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `type`                                                    | `'number' \| 'category' \| 'time' \| 'log' \| 'ordinal-time' \| 'grouped-category'` | based on series             | axis type                                                   |
| `position`                                                | `'bottom' \| 'left' \| 'top' \| 'right'`                                            | based on type               | axis side                                                   |
| `title.enabled`                                           | `boolean`                                                                           | `true` when `text` is set   | axis title                                                  |
| `title.text`                                              | `string`                                                                            | —                           | title text                                                  |
| `title.fontSize`                                          | `Pixels`                                                                            | `12`                        | title font size                                             |
| `title.color`                                             | `ColorValue`                                                                        | foreground                  | title color                                                 |
| `line.enabled`                                            | `boolean`                                                                           | category axis only          | axis line                                                   |
| `line.stroke`                                             | `ColorValue`                                                                        | theme axis (light grey)     | line color                                                  |
| `line.width`                                              | `Pixels`                                                                            | `1`                         | line width                                                  |
| `line.lineDash`                                           | `Pixels[]`                                                                          | solid                       | axis line dash pattern (`[]` forces a solid line)           |
| `tick.enabled`                                            | `boolean`                                                                           | `false`                     | ticks                                                       |
| `tick.size`                                               | `Pixels`                                                                            | `6`                         | tick length                                                 |
| `tick.width`                                              | `Pixels`                                                                            | `1`                         | tick width                                                  |
| `tick.stroke`                                             | `ColorValue`                                                                        | theme axis (light grey)     | tick color (`tick.color` is an alias)                       |
| `tick.lineDash`                                           | `Pixels[]`                                                                          | solid                       | tick dash pattern                                           |
| `label.enabled`                                           | `boolean`                                                                           | `true`                      | tick labels                                                 |
| `label.fontSize`                                          | `Pixels`                                                                            | `11`                        | label font size                                             |
| `label.fontFamily`                                        | `string`                                                                            | theme font                  | typeface                                                    |
| `label.color`                                             | `ColorValue`                                                                        | theme muted                 | label color                                                 |
| `label.spacing`                                           | `Pixels`                                                                            | `8`                         | outside labels: gap from the tick or the axis               |
| `label.insideSpacing`                                     | `Pixels`                                                                            | `4`                         | inside labels: indent from the axis                         |
| `label.insideAlign`                                       | `'element' \| 'gap'`                                                                | `'element'`                 | inside labels: hug the element or centre in the gap         |
| `label.insideGap`                                         | `Pixels`                                                                            | `4`                         | inside labels: clearance to their element                   |
| `label.placement`                                         | `'outside' \| 'inside'`                                                             | `'outside'`                 | labels beside the axis or inside the plot                   |
| `label.format`                                            | `string`                                                                            | —                           | format string (`',.2f'`, `'.0%'`, `'%d %b'`)                |
| `label.formatter`                                         | `({ value, index }) => string`                                                      | —                           | programmatic formatting                                     |
| `label.rotation`                                          | `Degrees \| 'auto'`                                                                 | `0`                         | tilt of the labels, clockwise (`-45`, `-90`); outside only  |
| `label.avoidCollisions`                                   | `boolean`                                                                           | `true`                      | skip overlapping labels                                     |
| `label.overflow`                                          | `'thin' \| 'ellipsis'`                                                              | `'thin'`                    | crowded labels: drop them, or keep and cut them             |
| `label.maxWidth`                                          | `Pixels`                                                                            | —                           | widest a label may be; longer text is cut                   |
| `label.ellipsis`                                          | `string`                                                                            | `'..'`                      | the mark standing where the text was cut                    |
| `gridLine.enabled`                                        | `boolean`                                                                           | value axis only             | grid lines                                                  |
| `gridLine.stroke`                                         | `ColorValue`                                                                        | theme axis (light grey)     | grid color                                                  |
| `gridLine.width`                                          | `Pixels`                                                                            | `1`                         | width                                                       |
| `gridLine.lineDash`                                       | `Pixels[]`                                                                          | `[4, 4]`                    | grid dash pattern                                           |
| `interval.values`                                         | `unknown[]`                                                                         | auto                        | explicit tick values                                        |
| `interval.minSpacing`                                     | `Pixels`                                                                            | `8`                         | minimum label spacing                                       |
| `crossLines[].type`                                       | `'line' \| 'range'`                                                                 | `'line'`                    | line or range                                               |
| `crossLines[].value`                                      | value                                                                               | —                           | line coordinate                                             |
| `crossLines[].range`                                      | `[from, to]`                                                                        | —                           | fill range                                                  |
| `crossLines[].stroke`                                     | `ColorValue`                                                                        | theme muted                 | line color                                                  |
| `crossLines[].strokeWidth`                                | `Pixels`                                                                            | `1`                         | line width                                                  |
| `crossLines[].lineDash`                                   | `Pixels[]`                                                                          | —                           | dash pattern                                                |
| `crossLines[].fill`                                       | `ColorValue`                                                                        | theme muted                 | range fill                                                  |
| `crossLines[].fillOpacity`                                | `Fraction`                                                                          | `0.12`                      | fill opacity                                                |
| `crossLines[].label.text`                                 | `string`                                                                            | —                           | label text                                                  |
| `crossLines[].label.color`                                | `ColorValue`                                                                        | theme muted                 | label color                                                 |
| `crossLines[].label.fontSize`                             | `Pixels`                                                                            | `11`                        | label font size                                             |
| `min` (number, log)                                       | `number`                                                                            | data domain                 | lower bound                                                 |
| `max` (number, log)                                       | `number`                                                                            | data domain                 | upper bound                                                 |
| `nice (number)`                                           | `boolean`                                                                           | `true`                      | round the domain to “nice” bounds                           |
| `base (log)`                                              | `number`                                                                            | `10`                        | logarithm base                                              |
| `paddingInner` (category, ordinal-time, grouped-category) | `Fraction`                                                                          | `0.2` (ordinal-time `0.25`) | gap between elements, share of the step                     |
| `gap` (category, ordinal-time, grouped-category)          | `Pixels`                                                                            | —                           | gap between elements in px; wins over `paddingInner`        |
| `paddingOuter` (category, ordinal-time, grouped-category) | `Fraction`                                                                          | `0.1`                       | outer band padding                                          |
| `bandSpan` (time, number)                                 | `number`                                                                            | step of the data            | width of a bar in axis units (ms on a time axis)            |
| `groupSpacing` (grouped-category)                         | `Pixels`                                                                            | `8`                         | gap between item labels and the group row, and between rows |
| `groupLabel.enabled` (grouped-category)                   | `boolean`                                                                           | `true`                      | rows of group names                                         |
| `groupLabel.fontSize` (grouped-category)                  | `Pixels`                                                                            | `11`                        | group name font size                                        |
| `groupLabel.fontFamily` (grouped-category)                | `string`                                                                            | theme font                  | typeface                                                    |
| `groupLabel.fontWeight` (grouped-category)                | `FontWeight`                                                                        | `'bold'`                    | group name weight                                           |
| `groupLabel.color` (grouped-category)                     | `ColorValue`                                                                        | foreground                  | group name color                                            |
| `groupLabel.format` (grouped-category)                    | `string`                                                                            | —                           | format string for the level value                           |
| `groupLabel.formatter` (grouped-category)                 | `({ value, level, start, end }) => string`                                          | —                           | programmatic formatting of a group name                     |
| `groupLabel.maxWidth` (grouped-category)                  | `Pixels`                                                                            | the run the group covers    | widest a group name may be                                  |

Horizontal axis labels are automatically thinned out when crowded
(`label.avoidCollisions: false` disables this), or cut instead, or turned to an
angle — see [Labels that do not fit](#labels-that-do-not-fit) and
[Labels at an angle](#labels-at-an-angle).

## Overlays

The “no data” and “loading” states are enabled by default: empty `data` shows
`overlays.noData.text`, and `loading: true` shows `overlays.loading.text`.
