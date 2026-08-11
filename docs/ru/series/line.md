# Line

Линейная серия: `xField` — категория, `yField` — числовое значение.

::: chart-example line-basic

## Несколько линий

Каждая серия — отдельный элемент массива `series`; цвета назначаются палитрой темы по порядку.

::: chart-example line-multi

## Подписи значений

`label` выводит значение у каждой точки; `placement` — top/bottom/left/right,
`formatter({ value, datum })` и шрифт настраиваются (ореол цвета фона —
читается поверх сетки):

::: chart-example line-labels

## Стили линий

`lineDash`, толщина, формы маркеров и общий тултип:

::: chart-example line-styles

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                | Тип                                      | По умолчанию                      | Описание                     |
| -------------------- | ---------------------------------------- | --------------------------------- | ---------------------------- |
| `xField`             | `string`                                 | —                                 | ключи данных (обязательны)   |
| `yField`             | `string`                                 | —                                 | ключи данных (обязательны)   |
| `xName`              | `string`                                 | `yField`                          | имена для легенды и тултипа  |
| `name`               | `string`                                 | `yField`                          | имена для легенды и тултипа  |
| `stroke`             | `ColorValue`                             | палитра темы                      | цвет линии                   |
| `strokeWidth`        | `Pixels`                                 | `2`                               | толщина линии                |
| `lineDash`           | `Pixels[]`                               | —                                 | пунктир                      |
| `visible`            | `boolean`                                | `true`                            | видимость серии              |
| `showInLegend`       | `boolean`                                | `true`                            | элемент в легенде            |
| `tooltip.renderer`   | `function`                               | —                                 | кастомное содержимое тултипа |
| `label.enabled`      | `boolean`                                | `false`                           | показать подписи значений    |
| `label.placement`    | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`                           | позиция подписи              |
| `label.formatter`    | `({ value, datum }) => string`           | значение                          | содержимое подписи           |
| `label.fontSize`     | `Pixels`                                 | `11`                              | размер шрифта подписи        |
| `label.fontWeight`   | `string \| number`                       | `normal`                          | насыщенность                 |
| `label.fontFamily`   | `string`                                 | шрифт темы                        | гарнитура                    |
| `label.color`        | `ColorValue`                             | foreground; внутри — автоконтраст | цвет текста                  |
| `marker.enabled`     | `boolean`                                | `true`                            | показать маркеры             |
| `marker.shape`       | `MarkerShape`                            | `circle`                          | форма маркера                |
| `marker.size`        | `Pixels`                                 | `7`                               | размер маркера               |
| `marker.fill`        | `ColorValue`                             | цвет серии                        | заливка маркера              |
| `marker.stroke`      | `ColorValue`                             | фон чарта                         | обводка маркера              |
| `marker.strokeWidth` | `Pixels`                                 | `1.5`                             | толщина обводки              |

Точки с нечисловыми значениями `yField` разрывают линию (`connectMissingData` — в будущих фазах).
