# Candlestick и OHLC

Финансовые серии: `openField` / `highField` / `lowField` / `closeField`. Ось X — `ordinal-time`:
каждая точка занимает бэнд, выходные не оставляют дыр.

::: chart-example candlestick-basic

## OHLC-бары

::: chart-example ohlc-basic

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                      | Тип                       | По умолчанию    | Описание                                     |
| -------------------------- | ------------------------- | --------------- | -------------------------------------------- |
| `xField`                   | `string`                  | —               | дата (Date / timestamp / строка)             |
| `openField` … `closeField` | `string`                  | —               | четыре ключа OHLC                            |
| `width`                    | preset                    | —               | размер и тема чарта в `createFinancialChart` |
| `height`                   | preset                    | —               | размер и тема чарта в `createFinancialChart` |
| `theme`                    | preset                    | —               | размер и тема чарта в `createFinancialChart` |
| `container`                | preset                    | —               | контейнер и данные `createFinancialChart`    |
| `data`                     | preset                    | —               | контейнер и данные `createFinancialChart`    |
| `dateField`                | preset                    | `date`/OHLC     | поля данных пресета                          |
| `openField`                | preset                    | `date`/OHLC     | поля данных пресета                          |
| `highField`                | preset                    | `date`/OHLC     | поля данных пресета                          |
| `lowField`                 | preset                    | `date`/OHLC     | поля данных пресета                          |
| `closeField`               | preset                    | `date`/OHLC     | поля данных пресета                          |
| `chartType`                | `'candlestick' \| 'ohlc'` | `'candlestick'` | тип серии пресета                            |
| `title`                    | preset                    | вкл.            | прокидываются в ChartOptions                 |
| `navigator`                | preset                    | вкл.            | прокидываются в ChartOptions                 |
| `zoom`                     | preset                    | вкл.            | прокидываются в ChartOptions                 |
| `annotations`              | preset                    | вкл.            | прокидываются в ChartOptions                 |
| `item.up.fill`             | `ColorValue`              | зелёный темы    | заливка растущих свечей                      |
| `item.down.fill`           | `ColorValue`              | красный темы    | заливка падающих                             |

## Financial preset

Готовая сборка одним вызовом — candlestick + ordinal-time + zoom + navigator + crosshair

- контекстное меню:

```ts
import { Charts } from 'grafit-charts';

const chart = Charts.createFinancialChart({
  container,
  data, // [{ date, open, high, low, close }]
  title: 'CHRT / USD',
  chartType: 'candlestick', // | 'ohlc'
});
```

Ключи переопределяются (`dateField`, `openField`, …), `navigator: false` / `zoom: false`
отключают блоки, `annotations` пробрасываются как есть.
