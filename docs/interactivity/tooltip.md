# Tooltip

Enabled by default: hovering shows the nearest node, the node itself is highlighted, and the other series are dimmed.

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), the tooltip is a separate module: `register(tooltipModule)`.
:::

By default the tooltip shows the `xField` value as the heading and a "series name: value" pair with the series marker. Point series (scatter, bubble) are the exception: both of their axes are measures, so the heading identifies the series (marker + `name`) and the values come as labelled rows — `xName: x`, `yName: y`, plus `sizeName: size` for bubble. The content is customized via `tooltip.renderer` on the series:

::: chart-example tooltip-custom

## Modes

`mode: 'single'` (default) shows the value of the nearest node;
`mode: 'shared'` shows the values of all visible series of the category in a single tooltip; nodes of all series are highlighted and no dimming is applied:

::: chart-example tooltip-shared

The mode means the same thing wherever series share a category: a radar carries a
measure per series the way a line chart does, so a spoke under the cursor answers
for all of them at once — and so do a rose and radial columns, which share their
angle axis too.

::: chart-example tooltip-shared-radar

## Options (chart-level)

| Option              | Type                               | Default                          | Description                                                                                                              |
| ------------------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `enabled`           | `boolean`                          | `true`                           | show the tooltip                                                                                                         |
| `mode`              | `'single' \| 'shared'`             | `'single'`                       | one node or the whole category                                                                                           |
| `position.anchorTo` | `'node' \| 'center' \| 'pointer'`  | `'node'`                         | node edge, node center, or the cursor                                                                                    |
| `position.xOffset`  | `Pixels`                           | `0`                              | tooltip offset                                                                                                           |
| `yOffset`           | `Pixels`                           | `0`                              | tooltip offset                                                                                                           |
| `range`             | `Pixels \| 'exact' \| 'nearest'`   | `30`                             | number — radius in px; `'exact'` — only direct hits on a node; `'nearest'` — nearest node from anywhere in the plot area |
| `container`         | `'chart' \| 'body' \| HTMLElement` | `'chart'`                        | where the tooltip element lives — see [Outside the chart](#outside-the-chart)                                            |
| `zIndex`            | `number`                           | `10`; outside the chart — `1000` | CSS z-index of the tooltip element                                                                                       |

## Outside the chart

The tooltip is a DOM element inside the chart container, kept within its
bounds. In a dashboard tile with `overflow: hidden`, or on a chart a few dozen
pixels tall, that is not enough room: the tooltip is clipped or covers the
chart itself. `container: 'body'` moves it to `document.body` with
`position: fixed` — it is placed next to the node in viewport coordinates and
kept within the viewport, so clipping ancestors no longer cut it:

```ts
Charts.create({
  container,
  tooltip: { container: 'body' },
  series: [{ type: 'area', xField: 'day', yField: 'visits', marker: { showOn: 'hover' } }],
});
```

An element instead of `'body'` puts the tooltip into that element — for apps
that keep overlays in a layer of their own; it is positioned the same way.
Outside the chart:

- scrolling the page or any scrollable ancestor, and resizing the window, hide
  the tooltip — the next pointer move shows it again in the right place;
- `destroy()` removes the element along with the chart;
- the theme font, size, weight and colors are set on the element itself, since it
  inherits nothing from the chart container;
- `position: fixed` is relative to the viewport unless an ancestor of the
  element has `transform`, `filter` or `contain` — keep such styles off the layer
  you pass.

## Appearance

The tooltip container is styled in the same `tooltip` block:

| Option         | Type                     | Default                     | Description                                                                                    |
| -------------- | ------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------- |
| `background`   | `ColorValue`             | theme background            | background                                                                                     |
| `borderColor`  | `ColorValue`             | theme muted color           | border color                                                                                   |
| `borderWidth`  | `Pixels`                 | `1`                         | border width; `0` removes the border                                                           |
| `borderRadius` | `Pixels`                 | `6`                         | corner radius                                                                                  |
| `shadow`       | `string \| false`        | `0 2px 8px rgba(0,0,0,.25)` | CSS box-shadow; `false` — no shadow                                                            |
| `padding`      | `PaddingValue \| string` | `7px 10px`                  | inner padding: `8`, `[8, 12]`, `[8, 12, 4, 0]`, `{ top, right, bottom, left }` or a CSS string |
| `fontSize`     | `Pixels`                 | `12`                        | font size                                                                                      |
| `fontFamily`   | `string`                 | `system-ui, sans-serif`     | font family                                                                                    |
| `color`        | `ColorValue`             | theme foreground            | text color                                                                                     |

```ts
tooltip: {
  background: '#141821',
  color: '#f0f0f0',
  borderColor: '#436ff4',
  borderRadius: 10,
  shadow: false,
},
```

## Series options

`series[].tooltip.renderer(params)` returns a string (which becomes the heading) or a structure:

```ts
renderer: ({ datum, xValue, yValue, seriesName, color }) => ({
  heading: String(xValue),
  rows: [{ label: seriesName, value: String(yValue), color }],
});
```

`params.datum` is the entire data row: the tooltip can display fields that are not part of the series.

`heading` is a string or a `{ text, color }` object; with `color` a marker matching the row markers is drawn before the heading text. This is how scatter and bubble render their default tooltip — the marker identifies the series rather than any single row:

```ts
renderer: ({ datum, xValue, yValue, seriesName, color }) => ({
  heading: { text: String(datum.category), color },
  rows: [
    { label: 'X', value: String(xValue) },
    { label: 'Y', value: String(yValue) },
  ],
});
```

Highlighting is controlled by the `highlight` block:

| Option                 | Type       | Default | Description                                        |
| ---------------------- | ---------- | ------- | -------------------------------------------------- |
| `enabled`              | `boolean`  | `true`  | highlight the node and dim the other series        |
| `dimOpacity`           | `Fraction` | `0.8`   | opacity of non-highlighted series (1 — no dimming) |
| `highlight.enabled`    | `boolean`  | `true`  | node highlighting and dimming                      |
| `highlight.dimOpacity` | `Fraction` | `0.8`   | opacity of non-highlighted series                  |
