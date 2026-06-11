# Tooltip

Enabled by default: hovering shows the nearest node, the node itself is highlighted, and the other series are dimmed.

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), the tooltip is a separate module: `register(tooltipModule)`.
:::

By default the tooltip shows the `xField` value as the heading and a "series name: value" pair. The content is customized via `tooltip.renderer` on the series:

::: chart-example tooltip-custom

## Modes

`mode: 'single'` (default) shows the value of the nearest node;
`mode: 'shared'` shows the values of all visible series of the category in a single tooltip; nodes of all series are highlighted and no dimming is applied:

::: chart-example tooltip-shared

## Options (chart-level)

| Option              | Type                                | Default      | Description                                                                                                                |
| ------------------- | ----------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `enabled`           | `boolean`                           | `true`       | show the tooltip                                                                                                           |
| `mode`              | `'single' \| 'shared'`              | `'single'`   | one node or the whole category                                                                                             |
| `position.anchorTo` | `'node' \| 'center' \| 'pointer'`   | `'node'`     | node edge, node center, or the cursor                                                                                      |
| `position.xOffset`  | `Pixels`                         | `0`          | tooltip offset                                                                                                             |
| `yOffset`           | `Pixels`                         | `0`          | tooltip offset                                                                                                             |
| `range`             | `Pixels \| 'exact' \| 'nearest'` | `30`         | number — radius in px; `'exact'` — only direct hits on a node; `'nearest'` — nearest node from anywhere in the plot area |

## Series options

`series[].tooltip.renderer(params)` returns a string (which becomes the heading) or a structure:

```ts
renderer: ({ datum, xValue, yValue, seriesName, color }) => ({
  heading: String(xValue),
  rows: [{ label: seriesName, value: String(yValue), color }],
});
```

`params.datum` is the entire data row: the tooltip can display fields that are not part of the series.

Highlighting is controlled by the `highlight` block:

| Option                 | Type      | Default      | Description                                            |
| ---------------------- | --------- | ------------ | ------------------------------------------------------ |
| `enabled`              | `boolean` | `true`       | highlight the node and dim the other series            |
| `dimOpacity`           | `Fraction`   | `0.8`        | opacity of non-highlighted series (1 — no dimming)     |
| `highlight.enabled`    | `boolean` | `true`       | node highlighting and dimming                          |
| `highlight.dimOpacity` | `Fraction`   | `0.8`        | opacity of non-highlighted series                      |
