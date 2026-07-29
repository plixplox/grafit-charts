# Title and subtitle

`title` and `subtitle` are drawn around the plot. Both accept the same options: text, font, color, alignment, vertical placement and the gap towards the plot.

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
| `spacing`    | `Pixels`                         | `8`                | gap on the plot-facing side of the caption |
| `wrap`       | `boolean`                        | `true`             | break long text onto several lines |

## Alignment and placement

`textAlign` positions the caption within the chart width, snapping to the chart `padding`; `position` moves it above or below the plot. The title and subtitle are configured independently — mix them freely, e.g. a left-aligned title on top with a footnote-style subtitle at the bottom right:

::: chart-example caption-align

When both captions share a zone, the title always stays above the subtitle; `spacing` faces the plot.

## Gap towards the plot

`spacing` is measured on the side that faces the plot: below the caption in the `'top'` zone, above it in the `'bottom'` zone. With both captions stacked on top, `title.spacing` separates the title from the subtitle, and `subtitle.spacing` separates the subtitle from the plot — so widening the gap under the captions means raising the `spacing` of whichever caption sits last:

```js
grafit.create({
  container: '#chart',
  title: { text: 'Site traffic', spacing: 4 },
  subtitle: { text: 'visits per month, thousands', spacing: 28 },
  // ...
});
```

Without a subtitle, `title.spacing` is the one that faces the plot. To move both captions away from the chart edge instead, use `padding.top` (or `padding.bottom`).

## Long text

A caption that does not fit the available width is broken between words onto several lines, each one a `fontSize × 1.25` step below the previous — the caption grows downwards (or upwards, in the `'bottom'` zone) and the plot area shrinks accordingly. A `'\n'` in the text always starts a new line, so a fixed two-line caption needs no measuring:

```js
title: { text: 'Site traffic by acquisition channel\ntwelve months to August' },
```

`wrap: false` keeps the text on a single line even when it overflows the chart — explicit `'\n'` breaks still apply.

A left-aligned title pairs well with a [floating legend](/interactivity/legend#floating-placement) pinned to the opposite corner on the same level:

::: chart-example legend-floating
