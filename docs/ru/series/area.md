# Area

Область под линией; заливается от нуля (или от предыдущей серии в стеке).

::: chart-example area-basic

## Подписи значений

`label` — как у line: placement top/bottom/left/right, `formatter`, шрифт:

::: chart-example area-labels

## Стекинг

`stacked: true` складывает области; порядок серий в массиве — порядок снизу вверх.

::: chart-example area-stacked

## Перекрывающиеся области

Без стекинга, с настройкой `fillOpacity`:

::: chart-example area-overlap

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                | Тип                                      | По умолчанию                      | Описание                                         |
| -------------------- | ---------------------------------------- | --------------------------------- | ------------------------------------------------ |
| `xField`             | `string`                                 | —                                 | ключи данных                                     |
| `yField`             | `string`                                 | —                                 | ключи данных                                     |
| `fill`               | `ColorValue`                               | палитра                           | заливка области                                  |
| `fillOpacity`        | `Fraction`                                  | `0.35`                            | заливка области                                  |
| `stroke`             | `ColorValue`                               | цвет заливки                      | верхняя линия                                    |
| `strokeWidth`        | `Pixels`                              | `2`                               | верхняя линия                                    |
| `lineDash`           | `Pixels[]`                            | —                                 | пунктир линии                                    |
| `normalizedTo`       | `number`                                 | —                                 | нормализация итога стека (100 — процентный стек) |
| `stacked`            | `boolean`                                | `false`                           | стекинг                                          |
| `stackGroup`         | `string`                                 | `false`                           | стекинг                                          |
| `label.enabled`      | `boolean`                                | `false`                           | показать подписи значений                        |
| `label.placement`    | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`                           | позиция подписи                                  |
| `label.formatter`    | `({ value, datum }) => string`           | значение                          | содержимое подписи                               |
| `label.fontSize`     | `Pixels`                              | `11`                              | размер шрифта подписи                            |
| `label.fontWeight`   | `string \| number`                       | `normal`                          | насыщенность                                     |
| `label.fontFamily`   | `string`                                 | шрифт темы                        | гарнитура                                        |
| `label.color`        | `ColorValue`                               | foreground; внутри — автоконтраст | цвет текста                                      |
| `marker.enabled`     | `boolean`                                | `false`                           | показать маркеры                                 |
| `marker.shape`       | `MarkerShape`                            | `circle`                          | форма маркера                                    |
| `marker.size`        | `Pixels`                              | `7`                               | размер маркера                                   |
| `marker.fill`        | `ColorValue`                               | цвет серии                        | заливка маркера                                  |
| `marker.stroke`      | `ColorValue`                               | фон чарта                         | обводка маркера                                  |
| `marker.strokeWidth` | `Pixels`                              | `1.5`                             | толщина обводки                                  |
