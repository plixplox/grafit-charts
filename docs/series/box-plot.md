# Box Plot

Distribution via five statistics per category: `minField`, `q1Field`, `medianField`, `q3Field`, `maxField`.

::: chart-example box-plot-basic

| Option              | Type       | Default    | Description                    |
| ------------------- | ---------- | ---------- | ------------------------------ |
| `xField`            | `string`   | —          | category                       |
| `minField…maxField` | `string`   | —          | the five statistics            |
| `fill`              | styles     | palette    | box fill                       |
| `fillOpacity`       | styles     | `0.45`     | box fill                       |
| `stroke`            | styles     | fill color | outlines and whiskers          |
| `strokeWidth`       | styles     | `1.5`      | outlines and whiskers          |
| `capLengthRatio`    | `Fraction` | `0.5`      | width of whisker caps          |
| `groupGap`          | `Fraction` | `0.2`      | gap between boxes of one group |
| `q1Field`           | `string`   | —          | quartiles and median           |
| `medianField`       | `string`   | —          | quartiles and median           |
| `q3Field`           | `string`   | —          | quartiles and median           |

## Styling

Box colors, stroke, and the whisker width fraction (`capLengthRatio`):

::: chart-example box-plot-styled

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

A box is five numbers, and `tooltip.renderer` is handed all of them —
`BoxPlotTooltipRendererParams`: `{ datum, xValue, min, q1, median, q3, max, seriesName, color }`.

```js
tooltip: { renderer: ({ median, q1, q3 }) => `median ${median} (${q1}–${q3})` },
```

Without a renderer the five rows are named `max`, `q3`, `median`, `q1`, `min` —
all [locale keys](/guide/accessibility#localization).
