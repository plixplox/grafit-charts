# Оси

Типы осей: `category` (бэнды), `number`, `time`, `log`. Связка по `position`:
`bottom`/`top` — ось X, `left`/`right` — ось Y.

## Временная ось

`time` принимает `Date`, timestamp или ISO-строку; тики встают на календарные границы,
формат подписи зависит от шага (часы → дни → месяцы → годы).

::: chart-example axis-time

## Логарифмическая ось

`log` — для данных, растущих на порядки; тики на степенях `base` (по умолчанию 10).

::: chart-example axis-log

## Иерархические категории

`grouped-category`: значения данных — массивы `[группа, элемент]`; под подписями
элементов появляется строка групп с разделителями:

::: chart-example axis-grouped

## CrossLines

Опорные линии и диапазоны в координатах оси — с подписями:

::: chart-example axis-crosslines

## Опции оси

| Блок       | Опции                              |
| ---------- | ---------------------------------- |
| number/log | `min`, `max`, `nice`, `base` (log) |
| time       | `min`, `max` (Date/timestamp)      |
| category   | `paddingInner`, `paddingOuter`     |

### Полный список опций

| Опция                                                     | Тип                                                                                 | По умолчанию                | Описание                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------- |
| `type`                                                    | `'number' \| 'category' \| 'time' \| 'log' \| 'ordinal-time' \| 'grouped-category'` | по сериям                   | тип оси                                      |
| `position`                                                | `'bottom' \| 'left' \| 'top' \| 'right'`                                            | по типу                     | сторона оси                                  |
| `title.enabled`                                           | `boolean`                                                                           | `true` при `text`           | заголовок оси                                |
| `title.text`                                              | `string`                                                                            | —                           | текст заголовка                              |
| `title.fontSize`                                          | `Pixels`                                                                         | `12`                        | шрифт заголовка                              |
| `title.color`                                             | `ColorValue`                                                                          | foreground                  | цвет заголовка                               |
| `line.enabled`                                            | `boolean`                                                                           | `true` (heatmap — выкл.)    | линия оси                                    |
| `line.stroke`                                             | `ColorValue`                                                                          | muted темы                  | цвет линии                                   |
| `line.width`                                              | `Pixels`                                                                         | `1`                         | толщина линии                                |
| `tick.enabled`                                            | `boolean`                                                                           | `true` (heatmap — выкл.)    | тики                                         |
| `tick.size`                                               | `Pixels`                                                                         | `6`                         | длина тика                                   |
| `tick.width`                                              | `Pixels`                                                                         | `1`                         | толщина тика                                 |
| `tick.stroke`                                             | `ColorValue`                                                                          | muted темы                  | цвет тика                                    |
| `label.enabled`                                           | `boolean`                                                                           | `true`                      | подписи делений                              |
| `label.fontSize`                                          | `Pixels`                                                                         | `11`                        | шрифт подписей                               |
| `label.fontFamily`                                        | `string`                                                                            | шрифт темы                  | гарнитура                                    |
| `label.color`                                             | `ColorValue`                                                                          | muted темы                  | цвет подписей                                |
| `label.spacing`                                           | `Pixels`                                                                         | `4`                         | отступ подписи от тика                       |
| `label.format`                                            | `string`                                                                            | —                           | format-строка (`',.2f'`, `'.0%'`, `'%d %b'`) |
| `label.formatter`                                         | `({ value, index }) => string`                                                      | —                           | программный формат                           |
| `label.avoidCollisions`                                   | `boolean`                                                                           | `true`                      | пропуск пересекающихся подписей              |
| `gridLine.enabled`                                        | `boolean`                                                                           | `true` (heatmap — выкл.)    | линии сетки                                  |
| `gridLine.stroke`                                         | `ColorValue`                                                                          | сетка темы                  | цвет сетки                                   |
| `gridLine.width`                                          | `Pixels`                                                                         | `1`                         | толщина                                      |
| `gridLine.lineDash`                                       | `Pixels[]`                                                                       | —                           | пунктир сетки                                |
| `interval.values`                                         | `unknown[]`                                                                         | авто                        | явные значения тиков                         |
| `interval.minSpacing`                                     | `Pixels`                                                                         | `8`                         | мин. расстояние подписей                     |
| `crossLines[].type`                                       | `'line' \| 'range'`                                                                 | `'line'`                    | линия или диапазон                           |
| `crossLines[].value`                                      | значение                                                                            | —                           | координата линии                             |
| `crossLines[].range`                                      | `[от, до]`                                                                          | —                           | диапазон заливки                             |
| `crossLines[].stroke`                                     | `ColorValue`                                                                          | muted темы                  | цвет линии                                   |
| `crossLines[].strokeWidth`                                | `Pixels`                                                                         | `1`                         | толщина линии                                |
| `crossLines[].lineDash`                                   | `Pixels[]`                                                                       | —                           | пунктир                                      |
| `crossLines[].fill`                                       | `ColorValue`                                                                          | muted темы                  | заливка диапазона                            |
| `crossLines[].fillOpacity`                                | `Fraction`                                                                             | `0.12`                      | прозрачность заливки                         |
| `crossLines[].label.text`                                 | `string`                                                                            | —                           | текст подписи                                |
| `crossLines[].label.color`                                | `ColorValue`                                                                          | muted темы                  | цвет подписи                                 |
| `crossLines[].label.fontSize`                             | `Pixels`                                                                         | `11`                        | шрифт подписи                                |
| `min` (number, log)                                       | `number`                                                                            | домен данных                | нижняя граница                               |
| `max` (number, log)                                       | `number`                                                                            | домен данных                | верхняя граница                              |
| `nice (number)`                                           | `boolean`                                                                           | `true`                      | округление домена до «красивых» границ       |
| `base (log)`                                              | `number`                                                                            | `10`                        | основание логарифма                          |
| `paddingInner` (category, grouped-category)               | `Fraction`                                                                             | `0.2` (ordinal-time `0.25`) | внутренний band-отступ                       |
| `paddingOuter` (category, ordinal-time, grouped-category) | `Fraction`                                                                             | `0.1`                       | внешний band-отступ                          |

Подписи горизонтальных осей автоматически прореживаются при тесноте
(`label.avoidCollisions: false` отключает).

## Overlays

Состояния «нет данных» и «загрузка» включены по умолчанию: пустой `data` показывает
`overlays.noData.text`, а `loading: true` — `overlays.loading.text`.
