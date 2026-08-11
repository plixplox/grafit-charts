# Scatter

Точечная серия; обе оси числовые по умолчанию (без `axes` создаются `number` + `number`).

::: chart-example scatter-basic

## Подписи точек

Подпись точки — это её имя и значение, нарисованные одним блоком: та же подпись,
что у сектора круговой или стадии воронки. Имя точке даёт `labelField`; без него
подпись — голое значение, как и раньше. `layout` ставит значение через
разделитель (`'inline'` — по умолчанию) или на свою строку, и у каждой половины
свой шрифт:

```js
labelField: 'country',
label: { enabled: true, category: { fontWeight: 'bold' }, value: { type: 'percent' } },
```

Имя точки — значение поля, поэтому то, как оно превращается в текст, — свойство
серии: `labelName` (`format` или `formatter`) проговаривает его и для заголовка
тултипа, и для подписи, а `label.category` перекрывает там, где подписи нужно
что-то короче.

`value.type: 'percent'` читает число как долю от суммы: для scatter — от значений
y, для bubble — от `sizeField`, то есть от того, частью чего пузырь и является.
`label.formatter({ value, datum })` по-прежнему говорит за всю подпись, когда
нужен один текст, и имеет приоритет над `category`/`value`:

::: chart-example scatter-labels

### Когда точек много

`label.minShare` оставляет без подписи точки ниже этой доли от суммы, а
`label.avoidOverlap` скрывает те подписи, которым не хватило места. Пузырьковая
серия раздаёт место по размеру — крупные пузыри сохраняют подписи, мелочь
теряет; у scatter ранжировать нечем, поэтому там выигрывает более ранняя точка:

::: chart-example bubble-crowded

## Формы маркеров

`shape`: circle, square, diamond, triangle, cross, plus:

::: chart-example scatter-shapes

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                      | Тип                                                  | По умолчанию                      | Описание                                                             |
| -------------------------- | ---------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `xField`                   | `string`                                             | —                                 | числовые ключи данных                                                |
| `yField`                   | `string`                                             | —                                 | числовые ключи данных                                                |
| `labelField`               | `string`                                             | —                                 | ключ имени точки (подпись и заголовок тултипа)                       |
| `labelName.format`         | `string`                                             | —                                 | как поле имени точки становится текстом: заголовок тултипа и подпись |
| `labelName.formatter`      | `({ datum, value }) => string`                       | —                                 | то же, когда строкой формата не выразить                             |
| `xName`                    | `string`                                             | `xField`                          | имя значения x в тултипе                                             |
| `yName`                    | `string`                                             | `yField`                          | имя значения y в тултипе                                             |
| `shape`                    | `MarkerShape`                                        | `'circle'`                        | форма маркера                                                        |
| `size`                     | `Pixels`                                             | `8`                               | размер маркера                                                       |
| `fill`                     | `ColorValue`                                         | палитра                           | заливка                                                              |
| `fillOpacity`              | `Fraction`                                           | `0.85`                            | заливка                                                              |
| `stroke`                   | `ColorValue`                                         | фон                               | обводка                                                              |
| `strokeWidth`              | `Pixels`                                             | `1`                               | обводка                                                              |
| `itemStyler`               | `(params) => style`                                  | —                                 | пер-точечные стили (fill/stroke/size) по `datum`                     |
| `label.enabled`            | `boolean`                                            | `false`                           | показать подписи значений                                            |
| `label.placement`          | `'top' \| 'bottom' \| 'left' \| 'right' \| 'inside'` | `'top'`                           | позиция подписи                                                      |
| `label.formatter`          | `({ value, datum }) => string`                       | —                                 | вся подпись сразу; приоритет над category/value                      |
| `label.layout`             | `'inline' \| 'stacked'`                              | `'inline'`                        | значение через разделитель или на своей строке                       |
| `label.separator`          | `string`                                             | `' · '`                           | разделитель половин inline-подписи                                   |
| `label.category.enabled`   | `boolean`                                            | `true` при заданном `labelField`  | имя точки как часть подписи                                          |
| `label.category.format`    | `string`                                             | —                                 | строка формата для поля имени                                        |
| `label.category.formatter` | `({ datum, label, value, share }) => …`              | —                                 | текст половины с именем                                              |
| `label.category.*`         | `FontOptions`                                        | шрифт подписи                     | шрифт имени                                                          |
| `label.value.enabled`      | `boolean`                                            | `true`                            | значение как часть подписи                                           |
| `label.value.type`         | `'value' \| 'percent'`                               | `'value'`                         | само значение или его доля от суммы                                  |
| `label.value.format`       | `string`                                             | —                                 | строка формата (`',.0f'`, `'.1%'`)                                   |
| `label.value.formatter`    | `({ datum, label, value, share }) => …`              | —                                 | текст половины со значением                                          |
| `label.value.*`            | `FontOptions`                                        | шрифт подписи                     | шрифт значения                                                       |
| `label.minShare`           | `Fraction`                                           | `0`                               | доля от суммы, начиная с которой точка достойна подписи              |
| `label.avoidOverlap`       | `boolean`                                            | `false`                           | скрывать подписи, которым не хватило места                           |
| `label.fontSize`           | `Pixels`                                             | `11`                              | размер шрифта подписи                                                |
| `label.fontWeight`         | `string \| number`                                   | `normal`                          | насыщенность                                                         |
| `label.fontFamily`         | `string`                                             | шрифт темы                        | гарнитура                                                            |
| `label.color`              | `ColorValue`                                         | foreground; внутри — автоконтраст | цвет текста                                                          |

`itemStyler` получает `{ datum, index, highlighted, fill, stroke, size }` и возвращает частичные стили —
так раскрашивают точки по условию без отдельных серий.

## Тултип

У точечной серии обе оси — измерения, поэтому значения выводятся подписанными строками:
`xName: x`, `yName: y`. В заголовке — имя точки, если его даёт `labelField`, иначе серия
(маркер + `name`). Bubble добавляет строку `sizeName: size` с долей от суммы размеров —
`Население, млн: 1412 (37%)`, как читает свою долю сектор круговой.
