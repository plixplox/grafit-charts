# Value Labels

A value label is the number printed beside a mark. Every series that draws
marks with a value can print it: line, area, scatter, bubble, bar, histogram,
range bar, waterfall, heatmap, funnel and pyramid, treemap, sunburst, sankey and
chord, pie and donut.

Labels are off by default (funnel, pyramid and treemap are the exceptions — they
are unreadable without them) and turn on per series:

```js
series: [{ type: 'bar', xField: 'month', yField: 'revenue', label: { enabled: true } }],
```

::: chart-example bar-labels

## Options

| Option         | Type                  | Default                                       | Description                                     |
| -------------- | --------------------- | --------------------------------------------- | ----------------------------------------------- |
| `enabled`      | `boolean`             | `false` (funnel/pyramid/treemap — `true`)     | show the labels                                 |
| `placement`    | depends on the series | `top` (heatmap/treemap — `center`)            | where the label sits relative to its mark       |
| `formatter`    | `(params) => string`  | the raw value                                 | label text; `params` depend on the series       |
| `avoidOverlap` | `boolean`             | `false`                                       | drop a label that collides with one already drawn ([below](#avoiding-overlap)) |
| `fontSize`     | `Pixels`              | `11` (funnel/pyramid — `12`)                  | font size                                       |
| `fontWeight`   | `string \| number`    | `normal`                                      | font weight                                     |
| `fontFamily`   | `string`              | theme font                                    | typeface                                        |
| `color`        | `ColorValue`          | foreground; inside a mark — auto-contrast     | text colour                                     |

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

A label placed inside its mark gets a halo in the mark's colour and its text
colour flips to whatever reads on that fill, so it stays legible over a dark
bar as well as a light one.

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
  wins over a later one. Put the series whose numbers matter most first.
- **Labels of the whole chart share one guard.** Two series avoid each other's
  labels, not only their own — but only the series that ask for it take part;
  a series without `avoidOverlap` draws its labels regardless and does not
  reserve anything.
- **Only labels count.** A label is dropped when it collides with another
  label, never when it merely sits over a bar or a line. Move such a label
  inside the mark (`placement: 'inner-top'`) or shorten it with a `formatter`.
- **Boxes get a 2px gap.** Two labels count as touching while less than that
  separates them.
- **Cartesian series and funnel/pyramid take the option.** Pie and donut spread
  crowded callout labels along their side of the circle instead of dropping any,
  and treemap prints a label only where the tile has room for it; sunburst,
  sankey and chord draw every label they are given.

Shortening the text is often the better fix — `formatter` gives you full
control:

```js
label: {
  enabled: true,
  avoidOverlap: true,
  formatter: ({ value }) => `${(value / 1_000_000).toFixed(1)}M`,
},
```
