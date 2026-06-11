# Candlestick and OHLC

Financial series: `openField` / `highField` / `lowField` / `closeField`. The X axis is `ordinal-time`:
each point occupies a band, so weekends leave no gaps.

::: chart-example candlestick-basic

## OHLC bars

::: chart-example ohlc-basic

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                     | Type                      | Default         | Description                                       |
| -------------------------- | ------------------------- | --------------- | ------------------------------------------------- |
| `xField`                   | `string`                  | —               | date (Date / timestamp / string)                  |
| `openField` … `closeField` | `string`                  | —               | the four OHLC keys                                |
| `width`                    | preset                    | —               | chart size and theme in `createFinancialChart`    |
| `height`                   | preset                    | —               | chart size and theme in `createFinancialChart`    |
| `theme`                    | preset                    | —               | chart size and theme in `createFinancialChart`    |
| `container`                | preset                    | —               | container and data for `createFinancialChart`     |
| `data`                     | preset                    | —               | container and data for `createFinancialChart`     |
| `dateField`                | preset                    | `date`/OHLC     | preset data fields                                |
| `openField`                | preset                    | `date`/OHLC     | preset data fields                                |
| `highField`                | preset                    | `date`/OHLC     | preset data fields                                |
| `lowField`                 | preset                    | `date`/OHLC     | preset data fields                                |
| `closeField`               | preset                    | `date`/OHLC     | preset data fields                                |
| `chartType`                | `'candlestick' \| 'ohlc'` | `'candlestick'` | preset series type                                |
| `title`                    | preset                    | on              | passed through to ChartOptions                    |
| `navigator`                | preset                    | on              | passed through to ChartOptions                    |
| `zoom`                     | preset                    | on              | passed through to ChartOptions                    |
| `annotations`              | preset                    | on              | passed through to ChartOptions                    |
| `item.up.fill`             | `ColorValue`                | theme green     | fill of rising candles                            |
| `item.down.fill`           | `ColorValue`                | theme red       | fill of falling candles                           |

## Financial preset

A ready-made bundle in a single call — candlestick + ordinal-time + zoom + navigator + crosshair

- context menu:

```ts
import { Charts } from 'grafit-charts';

const chart = Charts.createFinancialChart({
  container,
  data, // [{ date, open, high, low, close }]
  title: 'CHRT / USD',
  chartType: 'candlestick', // | 'ohlc'
});
```

The keys can be overridden (`dateField`, `openField`, …), `navigator: false` / `zoom: false`
disable those blocks, and `annotations` are passed through as-is.
