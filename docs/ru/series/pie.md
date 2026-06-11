# Pie и Donut

Полярные серии долей. `angleField` задаёт значение сектора, `labelField` — имя
(легенда, выносные подписи, тултип).

::: chart-example pie-basic

## Отступы и скругление у pie

Те же `sectorSpacing` и `cornerRadius` работают и без кольца:

::: chart-example pie-spacing

## Donut

`innerRadiusRatio` создаёт кольцо; `innerLabels` — текст в центре.

::: chart-example donut-basic

## Поворот, цвета, подписи долей

::: chart-example pie-rotation

## Кастомный тултип

`tooltip.renderer` серии получает `datum` целиком — в тултип можно выводить любые поля:

::: chart-example pie-tooltip

## Отступы и скругление

`sectorSpacing` — зазор между секторами (px), `cornerRadius` — скругление углов:

::: chart-example donut-spacing

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
| `calloutLabel.enabled`               | `boolean`                                    | вкл. при `labelField` | выносные подписи                                                        |
| `calloutLabel.fontSize`              | `Pixels`                                  | `11`                  | шрифт выносной подписи                                                  |
| `calloutLabel.fontFamily`            | `string`                                     | шрифт темы            | гарнитура                                                               |
| `calloutLabel.color`                 | `ColorValue`                                   | foreground            | цвет текста                                                             |
| `calloutLine.radial.length`          | `Pixels`                                  | `20`                  | длина радиального отрезка                                               |
| `calloutLine.radial.stroke`          | `ColorValue`                                   | цвет сектора          | цвет радиального отрезка                                                |
| `calloutLine.radial.strokeWidth`     | `Pixels`                                  | `1`                   | толщина                                                                 |
| `calloutLine.horizontal.length`      | `Pixels`                                  | `20`                  | длина хвоста к подписи                                                  |
| `calloutLine.horizontal.stroke`      | `ColorValue`                                   | как radial            | цвет хвоста                                                             |
| `calloutLine.horizontal.strokeWidth` | `Pixels`                                  | как radial            | толщина хвоста                                                          |
| `sectorLabel.enabled`                | `boolean`                                    | `false`               | доля в % внутри сектора                                                 |
| `sectorLabel.positionRatio`          | `Fraction`                                      | `0.7`                 | позиция вдоль радиуса                                                   |
| `sectorLabel.fontSize`               | `Pixels`                                  | `11`                  | шрифт                                                                   |
| `sectorLabel.color`                  | `ColorValue`                                   | автоконтраст          | цвет (ореол цвета сектора)                                              |
| `legendValue.enabled`                | `boolean`                                    | `false`               | значение сектора в легенде                                              |
| `legendValue.formatter`              | `({ datum, label, value, color }) => string` | значение              | формат значения                                                         |
| `tooltip.renderer`                   | `({ datum, label, value, color }) => …`      | —                     | кастомный тултип                                                        |
| `innerLabels[]`                      | `{ text, fontSize?, fontWeight?, color? }`   | —                     | строки в центре donut                                                   |
| `innerCircle.fill`                   | `ColorValue`                                   | —                     | заливка центра donut                                                    |
| `innerRadiusRatio`                   | `Fraction`                                      | `0.6`                 | внутренний радиус donut                                                 |

Клик по элементу легенды скрывает сектор (доли пересчитываются); непоместившиеся
элементы легенды пагинируются стрелками.
