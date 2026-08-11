# Waterfall

A cumulative bridge: each `yField` value is a change, and bars grow from the running total.
`totals` marks the indices of total rows (a bar from zero to the running total).

::: chart-example waterfall-basic

## Subtotals and styles

`totals` — indices of total rows (a bar from zero), colors by sign via `item`;
labels — `label.formatter({ value, isTotal, datum })` (placements are the same as for bar):

::: chart-example waterfall-styled

| Option               | Type                                     | Default                            | Description            |
| -------------------- | ---------------------------------------- | ---------------------------------- | ---------------------- |
| `xField`             | `string`                                 | —                                  | category and change    |
| `yField`             | `string`                                 | —                                  | category and change    |
| `totals`             | `number[]`                               | —                                  | indices of total rows  |
| `cornerRadius`       | `Pixels`                                 | `2`                                | bar corner rounding    |
| `label.enabled`      | `boolean`                                | `false`                            | show value labels      |
| `label.placement`    | outer/`center`/`inner-*` (17 placements) | `'top'`                            | label placement        |
| `label.formatter`    | `({ value, isTotal, datum }) => string`  | value                              | label content          |
| `label.fontSize`     | `Pixels`                                 | `11`                               | label font size        |
| `label.fontWeight`   | `string \| number`                       | `normal`                           | font weight            |
| `label.fontFamily`   | `string`                                 | theme font                         | font family            |
| `label.color`        | `ColorValue`                             | foreground; inside — auto contrast | text color             |
| `item.positive.fill` | `ColorValue`                             | series color                       | fill of positive steps |
| `item.negative.fill` | `ColorValue`                             | theme red                          | fill of negative steps |
| `item.total.fill`    | `ColorValue`                             | theme muted                        | fill of total bars     |
| `line.enabled`       | `boolean`                                | `true`                             | connector lines        |
| `line.stroke`        | `ColorValue`                             | theme muted                        | connector line color   |

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

Its tooltip is handed more than a value: a step is a difference and a running
total at once, so `tooltip.renderer` receives `WaterfallTooltipRendererParams` —
`{ datum, xValue, delta, total, isTotal, seriesName, color }`.

```js
tooltip: { renderer: ({ xValue, delta, total }) => `${String(xValue)}: ${delta > 0 ? '+' : ''}${delta} → ${total}` },
```

Without a renderer the rows are named `Total` and `Cumulative`; both are
[locale keys](/guide/accessibility#localization).
