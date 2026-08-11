# Value Labels

A value label is the number printed beside a mark. Every series that draws
marks with a value can print it: line, area, scatter, bubble, bar, histogram,
range bar, waterfall, heatmap, funnel and pyramid, treemap, sunburst, sankey and
chord, pie and donut, radar.

Labels are off by default (funnel, pyramid and treemap are the exceptions — they
are unreadable without them) and turn on per series:

```js
series: [{ type: 'bar', xField: 'month', yField: 'revenue', label: { enabled: true } }],
```

::: chart-example bar-labels

## Options

| Option         | Type                    | Default                                   | Description                                                                    |
| -------------- | ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `enabled`      | `boolean`               | `false` (funnel/pyramid/treemap — `true`) | show the labels                                                                |
| `placement`    | depends on the series   | `top` (heatmap/treemap — `center`)        | where the label sits relative to its mark                                      |
| `formatter`    | `(params) => string`    | the raw value                             | label text; `params` depend on the series                                      |
| `avoidOverlap` | `boolean`               | `false`                                   | drop a label that collides with one already drawn ([below](#avoiding-overlap)) |
| `minShare`     | `Fraction`              | `0`                                       | parts-of-a-whole series only: share of the total a part needs to be labelled   |
| `layout`       | `'inline' \| 'stacked'` | `'inline'` (pie `'stacked'`)              | name-and-value labels: the value behind a separator or on its own line         |
| `fontSize`     | `Pixels`                | `11` (funnel/pyramid — `12`)              | font size                                                                      |
| `fontWeight`   | `string \| number`      | `normal`                                  | font weight                                                                    |
| `fontFamily`   | `string`                | theme font                                | typeface                                                                       |
| `color`        | `ColorValue`            | foreground; inside a mark — auto-contrast | text colour                                                                    |

## Placement

Rectangular marks — bar, histogram, range bar, waterfall, heatmap cells — take
the full set: the four outer sides `top`, `bottom`, `left`, `right`, the outer
corners `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`, and
the inner variants of the same eight spots prefixed with `inner-`
(`inner-top`, `inner-bottom-right`, …).

Point marks — line, area, scatter — take `top`, `bottom`, `left`, `right`;
bubble adds `inside`, which centres the text on the marker. Funnel and pyramid
take `inside` and `outside`, where the outside label is joined to its segment by
a callout line.

A radar vertex takes the same five, plus `outward` — its default. Which way is
"away from the data" on a web depends on where on the circle the vertex sits, so
`outward` pushes the label along its own spoke and lets the polygon keep the
inside.

A label placed inside its mark gets a halo in the mark's colour and its text
colour flips to whatever reads on that fill, so it stays legible over a dark
bar as well as a light one.

## Sector labels

A pie or a donut labels a sector rather than a mark, so its label is put
together differently: the name and the value are one label of two parts, each
with its own font and colour, and `label.placement` moves the whole of it.
`'inside'` centres it in the sector over a halo of the sector colour:

::: chart-example pie-rotation

`'outside'` — the default — puts it beside the pie on a two-segment callout
line. Callout labels crowd near the top and the bottom of the circle, where
neighbouring sectors point almost the same way, so the pie spreads them down
its sides and gives up radius until the longest of them fits the chart area.

Which sectors get a label at all is `label.minShare`: below that share of the
total a sector is drawn but left unlabelled, which is what keeps a long tail
of slivers from burying the numbers that matter.

::: chart-example donut-significant

The [Pie and Donut](/series/pie) page has the full set: `layout` for putting
the two parts in one row, `separator`, `positionRatio`, per-part fonts and the
callout line options.

## Drawing order

Labels are drawn above **all** the marks of the chart, not just the ones of
their own series. A bar drawn later never covers the number of the bar before
it, and a second series never covers the labels of the first.

Room for a label hanging over the edge of the plot is reserved during layout:
the plot shrinks so that the text of an outer label fits the chart area instead
of being cut off at the canvas edge.

## Avoiding overlap

Labels crowd each other long before a chart runs out of room: marks at similar
heights put their numbers in the same row and the text collides. With
`avoidOverlap: true` a label whose box runs into one already drawn is left out:

```js
label: { enabled: true, avoidOverlap: true },
```

::: chart-example label-avoid-overlap

The rules are worth knowing before you turn it on:

- **The first label on a spot keeps it.** Series are asked in the order they are
  declared and each series goes through its data in order, so an earlier datum
  wins over a later one. Put the series whose numbers matter most first. Series
  whose marks read as parts of a whole — pie/donut, funnel/cone-funnel, pyramid,
  bubble — ask in size order instead: the largest part gets the spot, and the
  slivers are what a crowded chart drops.
- **Labels of the whole chart share one guard.** Two series avoid each other's
  labels, not only their own — but only the series that ask for it take part;
  a series without `avoidOverlap` draws its labels regardless and does not
  reserve anything.
- **Only labels count.** A label is dropped when it collides with another
  label, never when it merely sits over a bar or a line. Move such a label
  inside the mark (`placement: 'inner-top'`) or shorten it with a `formatter`.
- **Boxes get a 2px gap.** Two labels count as touching while less than that
  separates them.
- **Cartesian series, funnel/pyramid and pie/donut take the option.** A pie
  spreads crowded callout labels along its side of the circle whether or not the
  option is on; what the option adds is dropping the ones the spreading could
  not find room for, narrowest sector first. `label.minShare` is the other half
  of the answer, and pie/donut, funnel/cone-funnel, pyramid and scatter/bubble
  all take it: it leaves the long tail of slivers, thin stages, thin layers and
  specks unlabelled outright. Treemap prints a label only where the tile has room for it;
  sunburst, sankey and chord draw every label they are given.

On a pie the option works on the callout labels the spreading could not
separate — with no threshold to pick, the sides of the circle hold as many
labels as they have rows for:

::: chart-example donut-crowded

Shortening the text is often the better fix — `formatter` gives you full
control:

```js
label: {
  enabled: true,
  avoidOverlap: true,
  formatter: ({ value }) => `${(value / 1_000_000).toFixed(1)}M`,
},
```
