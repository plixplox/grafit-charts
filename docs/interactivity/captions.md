# Title and subtitle

`title` and `subtitle` are drawn around the plot. Both accept the same options: text, font, color, alignment, vertical placement and the padding around the text.

::: chart-example caption-styling

## Options

| Option       | Type                            | Default            | Description                     |
| ------------ | -------------------------------- | ------------------ | ------------------------------- |
| `text`       | `string`                         | —                  | caption text                    |
| `enabled`    | `boolean`                        | `true`             | show the caption                |
| `textAlign`  | `'left' \| 'center' \| 'right'`  | `'center'`         | alignment within the chart width (snaps to the chart `padding`) |
| `position`   | `'top' \| 'bottom'`              | `'top'`            | above or below the plot         |
| `fontSize`   | `Pixels`                         | `17` / `13`        | title / subtitle font size      |
| `fontWeight` | `FontWeight`                     | `'bold'` / `'normal'` | font weight                  |
| `fontFamily` | `string`                         | theme font         | font family                     |
| `color`      | `ColorValue`                     | foreground / muted | text color                      |
| `padding`    | `PaddingValue`                   | `8` on the plot-facing side | padding around the text: `8`, `[8, 12]`, `[8, 12, 4, 0]` or `{ top, right, bottom, left }` |
| `spacing`    | `Pixels`                         | `8`                | **deprecated** — the plot-facing side of `padding` |
| `wrap`       | `boolean`                        | `true`             | break long text onto several lines |

## Alignment and placement

`textAlign` positions the caption within the chart width, snapping to the chart `padding`; `position` moves it above or below the plot. The title and subtitle are configured independently — mix them freely, e.g. a left-aligned title on top with a footnote-style subtitle at the bottom right:

::: chart-example caption-align

When both captions share a zone, the title always stays above the subtitle; the padding of the last one faces the plot.

## Padding

`padding` takes the same CSS-like shorthand as everywhere else in the options — a single number, `[vertical, horizontal]`, `[top, right, bottom, left]`, or the named object:

```js
title: { text: 'Site traffic', padding: 12 },              // all four sides
title: { text: 'Site traffic', padding: [4, 24] },         // vertical, horizontal
title: { text: 'Site traffic', padding: [4, 24, 12, 24] }, // top, right, bottom, left
title: { text: 'Site traffic', padding: { bottom: 12 } },  // one side, the rest default
```

By default only the side facing the plot is padded, by 8px: below the caption in the `'top'` zone, above it in the `'bottom'` zone. Any side left out of the object form keeps that default, so `{ bottom: 12 }` on a top caption is just a wider gap towards the plot.

The vertical padding grows the caption block and shrinks the plot by the same amount. The horizontal padding narrows the width the text is measured against — a left-aligned caption starts `padding.left` in from the chart padding, and long text [wraps](#long-text) earlier:

```js
grafit.create({
  container: '#chart',
  title: { text: 'Site traffic', padding: { bottom: 4 } },
  subtitle: { text: 'visits per month, thousands', padding: { bottom: 28 } },
  // ...
});
```

With both captions stacked on top, `title.padding.bottom` separates the title from the subtitle, and `subtitle.padding.bottom` separates the subtitle from the plot — so widening the gap under the captions means padding whichever caption sits last. Without a subtitle, the title is the one facing the plot. To move both captions away from the chart edge instead, use the chart-level `padding.top` (or `padding.bottom`).

The older `spacing` option still works and sets the same plot-facing gap, but `padding` wins wherever both are given.

## Long text

A caption that does not fit the available width is broken between words onto several lines, each one a `fontSize × 1.25` step below the previous — the caption grows downwards (or upwards, in the `'bottom'` zone) and the plot area shrinks accordingly. A `'\n'` in the text always starts a new line, so a fixed two-line caption needs no measuring:

```js
title: { text: 'Site traffic by acquisition channel\ntwelve months to August' },
```

`wrap: false` keeps the text on a single line even when it overflows the chart — explicit `'\n'` breaks still apply.

## Flowing around a floating legend

A [floating legend](/interactivity/legend#floating-placement) overlays the whole chart area, captions included. By default the captions flow around it: every line that is level with the legend box is laid out in the wider gap beside it, and lines below it use the full width again. So a long title pinned to the left and a `top-right` legend share the top zone without overlapping:

::: chart-example caption-wrap

Turn the behaviour off with `legend.avoidCaptions: false` — the captions then use the full chart width and the legend is drawn over them. When the legend leaves no usable gap on either side (a wide legend anchored in the middle), a line falls back to the full width as well.

A short left-aligned title pairs well with a floating legend pinned to the opposite corner on the same level:

::: chart-example legend-floating
