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
| `spacing`    | `Pixels`                         | `8`                | gap between the caption and the plot |

## Alignment and placement

`textAlign` positions the caption within the chart width, snapping to the chart `padding`; `position` moves it above or below the plot. The title and subtitle are configured independently — mix them freely, e.g. a left-aligned title on top with a footnote-style subtitle at the bottom right:

::: chart-example caption-align

When both captions share a zone, the title always stays above the subtitle; `spacing` faces the plot.

A left-aligned title pairs well with a [floating legend](/interactivity/legend#floating-placement) pinned to the opposite corner on the same level:

::: chart-example legend-floating
