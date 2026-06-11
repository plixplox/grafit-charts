# Treemap

Иерархические серии без осей. Данные — вложенные через `children`; значение узла —
`sizeField` листа или сумма потомков.

## Treemap

Squarify-раскладка: вложенные прямоугольники, группы с заголовками.

::: chart-example treemap-basic

### Подписи и отступы плиток

`label` — как у heatmap: `placement` (9 позиций), `formatter`, шрифт; цвет
подбирается автоконтрастом по плитке. `itemPadding` — зазор между плитками:

::: chart-example treemap-labels

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция               | Серии                                 | По умолчанию                      | Описание                  |
| ------------------- | ------------------------------------- | --------------------------------- | ------------------------- |
| `groupHeaderHeight` | treemap                               | `18`                              | высота заголовка группы   |
| `fills`             | все                                   | палитра                           | цвета ветвей/слоёв        |
| `itemPadding`       | treemap                               | `2`                               | зазор между плитками      |
| `labelField`        | treemap                               | `label`/`size`/`children`         | ключи иерархии            |
| `sizeField`         | treemap                               | `label`/`size`/`children`         | ключи иерархии            |
| `childrenField`     | treemap                               | `label`/`size`/`children`         | ключи иерархии            |
| `label.enabled`     | `boolean`                             | `true`                            | показать подписи значений |
| `label.placement`   | `center`, края и углы (9 позиций)     | `'center'`                        | позиция подписи           |
| `label.formatter`   | `({ datum, label, value }) => string` | значение                          | содержимое подписи        |
| `label.fontSize`    | `Pixels`                           | `11`                              | размер шрифта подписи     |
| `label.fontWeight`  | `string \| number`                    | `normal`                          | насыщенность              |
| `label.fontFamily`  | `string`                              | шрифт темы                        | гарнитура                 |
| `label.color`       | `ColorValue`                            | foreground; внутри — автоконтраст | цвет текста               |
