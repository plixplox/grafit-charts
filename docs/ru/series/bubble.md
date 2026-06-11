# Bubble

Scatter с третьим измерением: `sizeField` управляет диаметром маркера в диапазоне `size…maxSize`.

::: chart-example bubble-basic

## Подписи внутри пузырьков

К позициям line добавляется `placement: 'inside'` — текст в центре пузырька
с автоконтрастным цветом и ореолом цвета маркера:

::: chart-example bubble-labels

## Диапазон размеров

`size`/`maxSize` задают диаметры для минимального и максимального значения `sizeField`:

::: chart-example bubble-scaled

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

Все опции [scatter](/ru/series/scatter), плюс:

| Опция              | Тип                                                  | По умолчанию                      | Описание                           |
| ------------------ | ---------------------------------------------------- | --------------------------------- | ---------------------------------- |
| `sizeField`        | `string`                                             | —                                 | ключ значения размера (обязателен) |
| `sizeName`         | `string`                                             | `sizeField`                       | имя в тултипе                      |
| `size`             | `Pixels`                                          | `8`                               | диаметр минимального значения      |
| `maxSize`          | `Pixels`                                          | `28`                              | диаметр максимального значения     |
| `shape`            | `MarkerShape`                                        | `circle`                          | форма маркера                      |
| `fill`             | стили                                                | палитра                           | заливка                            |
| `fillOpacity`      | стили                                                | `0.85`                            | заливка                            |
| `stroke`           | стили                                                | фон                               | обводка маркера                    |
| `strokeWidth`      | стили                                                | `1`                               | обводка маркера                    |
| `itemStyler`       | `(params) => MarkerItemStyle`                        | —                                 | стили отдельных точек              |
| `label.enabled`    | `boolean`                                            | `false`                           | показать подписи значений          |
| `label.placement`  | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                           | позиция подписи                    |
| `label.formatter`  | `({ value, datum }) => string`                       | значение                          | содержимое подписи                 |
| `label.fontSize`   | `Pixels`                                          | `11`                              | размер шрифта подписи              |
| `label.fontWeight` | `string \| number`                                   | `normal`                          | насыщенность                       |
| `label.fontFamily` | `string`                                             | шрифт темы                        | гарнитура                          |
| `label.color`      | `ColorValue`                                           | foreground; внутри — автоконтраст | цвет текста                        |
