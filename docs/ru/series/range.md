# Range Bar и Range Area

Серии диапазонов: вместо `yField` — пара `yLowField` / `yHighField`.

## Range Area

::: chart-example range-area-basic

## Range Bar

::: chart-example range-bar-basic

### Горизонтальные range-бары

`direction: 'horizontal'` разворачивает чарт: категории уходят на вертикальную ось.

::: chart-example range-bar-horizontal

### Цвет на каждый бар (Гант)

`fill` принимает колбэк `({ low, high, datum, index }) => цвет` — красит каждый бар
отдельно, например Гант-таймлайн по статусу задачи из одной серии:

::: chart-example range-bar-gantt

## Подписи диапазонов

`label.formatter({ low, high, datum })`; позиции как у bar — здесь `center`
внутри бара с автоконтрастом:

::: chart-example range-labels

## Комбинация со средней линией

Range-area как фон + line поверх, общий тултип:

::: chart-example range-combo

| Опция                | Тип                                    | Описание                                |
| -------------------- | -------------------------------------- | --------------------------------------- |
| `yLowField`          | `string`                               | границы диапазона                       |
| `yHighField`         | `string`                               | границы диапазона                       |
| `direction` (bar)    | `'vertical' \| 'horizontal'`           | направление баров (`vertical`)          |
| `fill`               | `ColorValue \| (params) => ColorValue` | заливка; колбэк красит по datum         |
| `fill`               | стили                                  | заливка                                 |
| `fillOpacity`        | стили                                  | заливка                                 |
| `stroke` (area)      | стили                                  | контурные линии                         |
| `strokeWidth` (area) | стили                                  | контурные линии                         |
| `cornerRadius` (bar) | `Pixels`                               | скругление                              |
| `groupGap` (bar)     | `Fraction`                             | зазор между барами одной группы (`0.2`) |

### Полный список опций

| Опция              | Тип                                     | По умолчанию                      | Описание                  |
| ------------------ | --------------------------------------- | --------------------------------- | ------------------------- |
| `label.enabled`    | `boolean`                               | `false`                           | показать подписи значений |
| `label.placement`  | внешние/`center`/`inner-*` (17 позиций) | `'top'`                           | позиция подписи           |
| `label.formatter`  | `({ low, high, datum }) => string`      | значение                          | содержимое подписи        |
| `label.fontSize`   | `Pixels`                                | `11`                              | размер шрифта подписи     |
| `label.fontWeight` | `string \| number`                      | `normal`                          | насыщенность              |
| `label.fontFamily` | `string`                                | шрифт темы                        | гарнитура                 |
| `label.color`      | `ColorValue`                            | foreground; внутри — автоконтраст | цвет текста               |

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

Элемент размаха занимает два значения, поэтому `tooltip.renderer` — и у range
bar, и у range area — получает `RangeTooltipRendererParams`:
`{ datum, xValue, low, high, seriesName, color }`.

```js
tooltip: { renderer: ({ low, high }) => `${String(low)} – ${String(high)}` },
```
