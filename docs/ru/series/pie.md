# Pie и Donut

Полярные серии долей. `angleField` задаёт значение сектора, `labelField` — имя
(легенда, подписи секторов, тултип).

Подпись сектора — одна подпись из двух частей, имени и значения, у каждой свой
шрифт и цвет. `label.placement` решает, где ей быть целиком: `'outside'` — на
выноске рядом с кругом, `'inside'` — внутри сектора. Подписи внутри получают
ореол цвета сектора и автоматический контрастный цвет текста.

::: chart-example pie-basic

## Отступы и скругление у pie

Те же `sectorSpacing` и `cornerRadius` работают и без кольца:

::: chart-example pie-spacing

## Donut

`innerRadiusRatio` создаёт кольцо; `innerLabels` — текст в центре.

::: chart-example donut-basic

## Поворот, цвета, подписи внутри секторов

::: chart-example pie-rotation

## Кастомный тултип

`tooltip.renderer` серии получает `datum` целиком — в тултип можно выводить любые поля:

::: chart-example pie-tooltip

## Отступы и скругление

`sectorSpacing` — зазор между секторами (px), `cornerRadius` — скругление углов:

::: chart-example donut-spacing

## Длинный хвост мелких секторов

Узкий сектор рисуется, каким бы узким он ни был: уступает зазор
`sectorSpacing`, а не сектор, который он должен был отделить.

Подпись получает каждый сектор, какого бы размера он ни был, — по умолчанию
тесные подписи просто накладываются друг на друга. Проредить их можно двумя
опциями, и отвечают они на разные вопросы.

`label.minShare` решает, какие секторы вообще достойны подписи: ниже этой доли
от суммы сектор рисуется, но без подписи. Именно это делает длинный хвост
читаемым — выноски достаются числам, на которых держится диаграмма, а мелочь
остаётся в кольце и в тултипе.

::: chart-example donut-significant

`label.avoidOverlap` решает, есть ли для подписи место. Подписи выстраиваются в
строки по сторонам круга, и когда у стороны кончаются строки, подпись теряют
самые узкие секторы на ней: порог подбирать не нужно, но набор уцелевших
подписей зависит от размера чарта.

::: chart-example donut-crowded

Опции складываются: `minShare` отбирает секторы, достойные подписи,
`avoidOverlap` гарантирует, что оставшиеся не столкнутся.

## Значения в легенде

`legendValue` выводит значение сектора справа от подписи; тултип здесь привязан
к курсору (`tooltip.position.anchorTo: 'pointer'`):

::: chart-example donut-legend-values

## Donut-прогресс

Тонкое кольцо + `innerLabels` — компактный индикатор:

::: chart-example donut-progress

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                                | Тип                                          | По умолчанию          | Описание                                                                |
| ------------------------------------ | -------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `angleField`                         | `string`                                     | —                     | значение сектора (обязательно)                                          |
| `labelField`                         | `string`                                     | —                     | имя сектора                                                             |
| `fills`                              | `ColorValue[]`                                 | палитра темы          | цвета секторов по кругу                                                 |
| `strokes`                            | `ColorValue[]`                                 | палитра темы          | цвета секторов по кругу                                                 |
| `rotation`                           | `Degrees`                                     | `0`                   | начальный угол                                                          |
| `outerRadiusRatio`                   | `Fraction`                                      | `0.85`                | доля свободного радиуса под чарт (подписи выносятся в оставшееся место) |
| `innerRadiusRatio` (donut)           | `Fraction`                                      | `0.6`                 | внутренний радиус                                                       |
| `angleName`                          | `string`                                     | имя `angleField`      | подпись значения в тултипе                                              |
| `sectorSpacing`                      | `Pixels`                                  | `0`                   | зазор постоянной ширины между секторами                                 |
| `cornerRadius`                       | `Pixels`                                  | `0`                   | скругление углов секторов                                               |
| `label.enabled`                      | `boolean`                                    | вкл. при `labelField` | подписи секторов                                                        |
| `label.placement`                    | `'outside' \| 'inside'`                      | `'outside'`           | снаружи на выноске или внутри сектора                                   |
| `label.layout`                       | `'stacked' \| 'inline'`                      | `'stacked'`           | значение отдельной строкой под именем или в одну строку с ним           |
| `label.separator`                    | `string`                                     | `' · '`               | разделитель частей однострочной подписи                                 |
| `label.positionRatio`                | `Fraction`                                      | `0.7`                 | позиция вдоль радиуса (при `placement: 'inside'`)                       |
| `label.minShare`                     | `Fraction`                                      | `0`                   | доля от суммы, начиная с которой сектор достоин подписи                 |
| `label.avoidOverlap`                 | `boolean`                                       | `false`               | скрывать подписи, которым не хватило места, вместо наложения            |
| `label.category.enabled`             | `boolean`                                    | вкл. при `labelField` | имя сектора в подписи                                                   |
| `label.category.fontSize`            | `Pixels`                                  | `11`                  | шрифт имени                                                             |
| `label.category.fontFamily`          | `string`                                     | шрифт темы            | гарнитура                                                               |
| `label.category.fontWeight`          | `string \| number`                           | `normal`              | насыщенность                                                            |
| `label.category.color`               | `ColorValue`                                   | foreground / автоконтраст | цвет текста                                                         |
| `label.value.enabled`                | `boolean`                                    | `false`               | значение сектора в подписи                                              |
| `label.value.type`                   | `'percent' \| 'value'`                       | `'percent'`           | доля от суммы или значение `angleField`                                 |
| `label.value.format`                 | `string`                                     | —                     | строка формата (`',.2f'`, `'.1%'`)                                      |
| `label.value.formatter`              | `({ datum, label, value, share }) => string` | —                     | полный контроль над текстом                                             |
| `label.value.fontSize`               | `Pixels`                                  | `11`                  | шрифт значения                                                          |
| `label.value.color`                  | `ColorValue`                                   | foreground / автоконтраст | цвет текста                                                         |
| `calloutLine.radial.length`          | `Pixels`                                  | `20`                  | длина радиального отрезка                                               |
| `calloutLine.radial.stroke`          | `ColorValue`                                   | цвет сектора          | цвет радиального отрезка                                                |
| `calloutLine.radial.strokeWidth`     | `Pixels`                                  | `1`                   | толщина                                                                 |
| `calloutLine.horizontal.length`      | `Pixels`                                  | `20`                  | длина хвоста к подписи                                                  |
| `calloutLine.horizontal.stroke`      | `ColorValue`                                   | как radial            | цвет хвоста                                                             |
| `calloutLine.horizontal.strokeWidth` | `Pixels`                                  | как radial            | толщина хвоста                                                          |
| `legendValue.enabled`                | `boolean`                                    | `false`               | значение сектора в легенде                                              |
| `legendValue.formatter`              | `({ datum, label, value, color }) => string` | значение              | формат значения                                                         |
| `tooltip.renderer`                   | `({ datum, label, value, color }) => …`      | —                     | кастомный тултип                                                        |
| `innerLabels[]`                      | `{ text, fontSize?, fontWeight?, color? }`   | —                     | строки в центре donut                                                   |
| `innerCircle.fill`                   | `ColorValue`                                   | —                     | заливка центра donut                                                    |
| `innerRadiusRatio`                   | `Fraction`                                      | `0.6`                 | внутренний радиус donut                                                 |

Клик по элементу легенды скрывает сектор (доли пересчитываются); непоместившиеся
элементы легенды пагинируются стрелками.
