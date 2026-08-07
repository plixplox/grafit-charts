# Themes

A theme is one set of design tokens the whole chart reads from: the series
palette, the surface and text colors, the base type size, line widths, mark
rounding and fill opacity, the semantic up/down colors, and the axis chrome.
`theme` accepts a built-in theme name or a `ThemeOptions` object.

Building one by hand is optional — the [theme builder](./theme-builder) has every
token as a control, with live previews and a JSON export.

## Built-in themes

Seven presets ship with the library. `THEME_NAMES` lists them, so a select needs
no hardcoded list:

```ts
import { Charts, THEME_NAMES, type ThemeName } from 'grafit-charts';

for (const name of THEME_NAMES) select.append(new Option(name, name));
void chart.updateDelta({ theme: select.value as ThemeName });
```

| Name         | Surface | What it is                                                                  |
| ------------ | ------- | --------------------------------------------------------------------------- |
| `'default'`  | light   | the neutral light theme, used when `theme` is omitted                       |
| `'dark'`     | dark    | the neutral dark theme                                                      |
| `'vibrant'`  | light   | saturated hues, ordered so no adjacent pair collapses under color blindness |
| `'muted'`    | light   | low-chroma palette on a warm surface                                        |
| `'mono'`     | light   | one hue from light to dark — for stages and tiers, not unrelated categories |
| `'contrast'` | light   | every series color clears 3:1, ticks on, solid grid, thicker lines          |
| `'midnight'` | dark    | a navy-cast dark theme, palette stepped for the darker surface              |

`'default'` — light (used when `theme` is omitted):

::: chart-example theme-light

`'dark'` — dark:

::: chart-example theme-dark

`'contrast'` — the accessibility-forward preset, which changes the chrome as well
as the colors:

::: chart-example theme-preset-contrast

The theme can be switched on the fly — `chart.updateDelta({ theme: 'dark' })`
re-renders the chart with animation. The demos on this site switch this way
along with the page theme (unless the example sets a theme explicitly).

::: tip Palettes and color vision
`'vibrant'`, `'contrast'` and `'midnight'` were checked against a color-vision
simulation: no two neighbouring series colors collapse into one under protanopia
or deuteranopia. `'muted'` sits closer to the limit — good for up to four series,
or with value labels on. The palette shared by `'default'` and `'dark'` predates
that check and keeps its published colors for compatibility.
:::

## Custom theme

A theme object is `baseTheme` (the foundation) + `palette` (series colors,
cycled) + `params` (design tokens) + `axis` (axis chrome):

::: chart-example theme-custom

A color set on a series (`fill`, `stroke`) takes precedence over the theme
palette.

## Design tokens

`params` holds one value each, applied across every series type at once:

::: chart-example theme-tokens

Three of them behave differently from the rest. `cornerRadius` and `fillOpacity`
are **unset by default**, because the built-in values differ on purpose — a bar
is square while a range bar is rounded, an area fills at 0.35 while a marker fills
at 0.85. Leave them out and every mark keeps its own default; set them and they
override all of it at once.

`fontSize` is the **base** size, 11 by default. Every other label is a fixed
offset from it — axis labels sit at the base, the legend and axis titles one step
above, the chart title six. Moving the base moves the whole scale and keeps the
hierarchy.

### Web fonts

Canvas text never triggers a font download by itself: a `@font-face` family that
the browser has not fetched yet would draw — and be measured — with a fallback
face. The chart therefore asks the browser for every family its options mention,
and once the real faces arrive it lays out and draws again, so labels, axes and
the legend end up sized against the font you asked for.

Fonts the page declares later — a lazily loaded CSS chunk, a `document.fonts.add()`
from your own code — are covered too: the chart listens for them and redraws when
one of its families lands.

Switching `fontFamily` to a font that is still loading therefore produces two
frames. `chart.waitForUpdate()` resolves after the second one — await it before
`getImageDataURL()` if you export the chart.

To keep the first frame as the only one, opt out:

```js
{
  fonts: { autoReload: false },
}
```

The chart then draws with whatever face the browser already has and never asks
for the missing ones — with a not-yet-loaded family it stays on the fallback,
since canvas text triggers no font download on its own.

## Axis chrome

`ChartOptions.axes` is an array, so `overrides` cannot reach it — that is what the
`axis` block is for. It carries the switches, the metrics and the colors of every
axis at once:

```ts
theme: {
  baseTheme: 'default',
  axis: {
    tick: true,
    tickSize: 4,
    gridDash: [],
    gridColor: '#eceff3',
    labelSize: 12,
    titleColor: '#1f2733',
  },
}
```

The three switches are master switches: turning one off silences that chrome
everywhere, while leaving it on keeps the usual rule (the value axis gets the
grid, the category axis gets the line). To turn the grid _on_ where the rule
turned it off, set it on the axis itself.

The colors are optional refinements. Leave `color`, `gridColor` and `tickColor`
alone and all three follow `params.axisColor`; leave `labelColor` alone and it
follows `params.mutedColor`, `titleColor` follows `params.foregroundColor`. Set
one and only that element changes.

## Legend and tooltip

These are ordinary `ChartOptions` blocks, so the theme reaches them through
`overrides.common` — there are no separate tokens for them, because two paths to
one pixel is worse than one:

```ts
theme: {
  baseTheme: 'dark',
  overrides: {
    common: {
      legend: { position: 'right', item: { label: { fontSize: 13 } }, background: { fill: '#1b1f27', cornerRadius: 8 } },
      tooltip: { background: '#11151c', borderColor: '#2b313b', borderRadius: 10 },
    },
  },
}
```

Everything in [`LegendOptions`](/reference/interfaces/LegendOptions) and
[`TooltipOptions`](/reference/interfaces/TooltipOptions) is available this way,
and a chart that sets the same option itself still wins.

## Overrides

`overrides` are partial options layered beneath user options: `common` —
chart-level blocks for all charts, `<seriesType>.series` — defaults for series
of that type. It is the escape hatch for everything tokens cannot express:
per-series-type styling and non-style options such as `legend.position`.

::: chart-example theme-overrides

Precedence: library defaults < theme tokens < `overrides.common` <
`overrides[type].series` < explicit options. Tokens sit below `overrides`
because overrides are merged into the options before a renderer ever consults
the theme.

## ThemeOptions

| Option                          | Type                      | Description                                                       |
| ------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `baseTheme`                     | `ThemeName`               | base theme to build on                                            |
| `palette.fills`                 | `ColorValue[]`            | series fill colors, by series index                               |
| `palette.strokes`               | `ColorValue[]`            | stroke colors (defaults to fills)                                 |
| `palette.sequential`            | `ColorValue[]`            | ramp for `colorField` series and the gradient legend              |
| `params.backgroundColor`        | `ColorValue`              | chart background                                                  |
| `params.foregroundColor`        | `ColorValue`              | primary text color                                                |
| `params.mutedColor`             | `ColorValue`              | secondary text: axis labels, subtitle, legend values              |
| `params.axisColor`              | `ColorValue`              | axis lines, ticks and grid                                        |
| `params.fontFamily`             | `string`                  | font for all text                                                 |
| `params.fontSize`               | `Pixels`                  | base label size (11); every other size moves with it              |
| `params.strokeWidth`            | `Pixels`                  | data line width — line, area and radar strokes                    |
| `params.lineDash`               | `Pixels[]`                | dash pattern of data lines; `[]` draws them solid                 |
| `params.markStrokeWidth`        | `Pixels`                  | outline width of filled marks — bars, sectors, boxes              |
| `params.cornerRadius`           | `Pixels`                  | rounding of every rectangular mark; unset keeps per-mark defaults |
| `params.fillOpacity`            | `Fraction`                | opacity of every filled mark; unset keeps per-mark defaults       |
| `params.positiveColor`          | `ColorValue`              | growth: candlesticks, OHLC bars                                   |
| `params.negativeColor`          | `ColorValue`              | decline: candlesticks, OHLC bars, falling waterfall columns       |
| `axis.line`                     | `boolean`                 | the axis line                                                     |
| `axis.tick`                     | `boolean`                 | tick marks                                                        |
| `axis.gridLine`                 | `boolean`                 | grid lines (and the polar web)                                    |
| `axis.strokeWidth`              | `Pixels`                  | thickness of the line, the ticks and the grid                     |
| `axis.gridDash`                 | `Pixels[]`                | grid dash pattern; `[]` draws a solid line                        |
| `axis.lineDash`                 | `Pixels[]`                | dash pattern of the axis line itself; solid by default            |
| `axis.color`                    | `ColorValue`              | the axis line alone; defaults to `params.axisColor`               |
| `axis.gridColor`                | `ColorValue`              | the grid alone; defaults to `params.axisColor`                    |
| `axis.tickColor`                | `ColorValue`              | the ticks alone; defaults to `params.axisColor`                   |
| `axis.tickSize`                 | `Pixels`                  | tick length (6)                                                   |
| `axis.labelColor`               | `ColorValue`              | tick labels; defaults to `params.mutedColor`                      |
| `axis.labelSize`                | `Pixels`                  | tick label size; defaults to `params.fontSize`                    |
| `axis.labelSpacing`             | `Pixels`                  | gap between the axis line and its labels (8)                      |
| `axis.titleColor`               | `ColorValue`              | axis title; defaults to `params.foregroundColor`                  |
| `axis.titleSize`                | `Pixels`                  | axis title size; one step above `params.fontSize`                 |
| `overrides.common`              | `Record<string, unknown>` | chart-level blocks for all charts                                 |
| `overrides.<seriesType>.series` | `Record<string, unknown>` | defaults for series of a specific type                            |
