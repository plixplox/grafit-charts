# Scatter

Точечная серия; обе оси числовые по умолчанию (без `axes` создаются `number` + `number`).

::: chart-example scatter-basic

## Подписи значений

`label.formatter({ value, datum })` — любые поля датума в подписи:

::: chart-example scatter-labels

## Формы маркеров

`shape`: circle, square, diamond, triangle, cross, plus:

::: chart-example scatter-shapes

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция              | Тип                                                  | По умолчанию                      | Описание                                         |
| ------------------ | ---------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| `xField`           | `string`                                             | —                                 | числовые ключи данных                            |
| `yField`           | `string`                                             | —                                 | числовые ключи данных                            |
| `xName`            | `string`                                             | `xField`                          | имя значения x в тултипе                         |
| `yName`            | `string`                                             | `yField`                          | имя значения y в тултипе                         |
| `shape`            | `MarkerShape`                                        | `'circle'`                        | форма маркера                                    |
| `size`             | `Pixels`                                          | `8`                               | размер маркера                                   |
| `fill`             | `ColorValue`                                           | палитра                           | заливка                                          |
| `fillOpacity`      | `Fraction`                                              | `0.85`                            | заливка                                          |
| `stroke`           | `ColorValue`                                           | фон                               | обводка                                          |
| `strokeWidth`      | `Pixels`                                          | `1`                               | обводка                                          |
| `itemStyler`       | `(params) => style`                                  | —                                 | пер-точечные стили (fill/stroke/size) по `datum` |
| `label.enabled`    | `boolean`                                            | `false`                           | показать подписи значений                        |
| `label.placement`  | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                           | позиция подписи                                  |
| `label.formatter`  | `({ value, datum }) => string`                       | значение                          | содержимое подписи                               |
| `label.fontSize`   | `Pixels`                                          | `11`                              | размер шрифта подписи                            |
| `label.fontWeight` | `string \| number`                                   | `normal`                          | насыщенность                                     |
| `label.fontFamily` | `string`                                             | шрифт темы                        | гарнитура                                        |
| `label.color`      | `ColorValue`                                           | foreground; внутри — автоконтраст | цвет текста                                      |

`itemStyler` получает `{ datum, index, highlighted, fill, stroke, size }` и возвращает частичные стили —
так раскрашивают точки по условию без отдельных серий.

## Тултип

У точечной серии обе оси — измерения, поэтому тултип по умолчанию обозначает серию в заголовке
(маркер + `name`), а значения выводит подписанными строками: `xName: x`, `yName: y` (bubble добавляет `sizeName: size`).
