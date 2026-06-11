# Histogram

Распределение числового поля по корзинам. `xField` — числовое поле; без `yField` считается количество записей.

::: chart-example histogram-basic

## Количество корзин

`binCount` управляет детализацией (или задайте границы явно через `bins`):

::: chart-example histogram-bins

## Подписи корзин

`label` — позиции как у bar (`top`, `inner-top`, `center`, …),
`formatter({ value, x0, x1 })`:

::: chart-example histogram-labels

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция              | Тип                                     | По умолчанию                      | Описание                            |
| ------------------ | --------------------------------------- | --------------------------------- | ----------------------------------- |
| `xField`           | `string`                                | —                                 | числовое поле для корзин            |
| `yField`           | `string`                                | —                                 | поле агрегации (опционально)        |
| `aggregation`      | `'count' \| 'sum' \| 'mean'`            | `count` / `sum`                   | способ агрегации (с `yField` — sum) |
| `binCount`         | `number`                                | `10`                              | число корзин                        |
| `bins`             | `[number, number][]`                    | —                                 | явные границы корзин                |
| `fill`             | стили                                   | палитра                           | оформление столбцов                 |
| `stroke`           | стили                                   | палитра                           | оформление столбцов                 |
| `fillOpacity`      | стили                                   | палитра                           | оформление столбцов                 |
| `strokeWidth`      | стили                                   | `1`                               | обводка корзин                      |
| `label.enabled`    | `boolean`                               | `false`                           | показать подписи значений           |
| `label.placement`  | внешние/`center`/`inner-*` (17 позиций) | `'top'`                           | позиция подписи                     |
| `label.formatter`  | `({ value, x0, x1 }) => string`         | значение                          | содержимое подписи                  |
| `label.fontSize`   | `Pixels`                             | `11`                              | размер шрифта подписи               |
| `label.fontWeight` | `string \| number`                      | `normal`                          | насыщенность                        |
| `label.fontFamily` | `string`                                | шрифт темы                        | гарнитура                           |
| `label.color`      | `ColorValue`                              | foreground; внутри — автоконтраст | цвет текста                         |
