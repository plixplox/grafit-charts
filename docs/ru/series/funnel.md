# Funnel и Pyramid

Стадийные серии без осей: плоские данные `stageField`/`valueField`.

## Funnel

Стадии сверху вниз, ширина пропорциональна значению. `funnel` — прямоугольные
стадии, `cone-funnel` — трапеции до следующей стадии.

::: chart-example funnel-basic

### Отступы и подписи снаружи

`itemSpacing` — зазор между сегментами; `label.placement: 'outside'` выносит
подписи вправо. Геометрия фигуры не зависит от подписей — ширину задаёт `widthRatio`:

::: chart-example funnel-spacing

### Cone-воронка с подписями снаружи

Трапециевидные стадии; линия идёт от наклонной грани. Внутренние подписи
получают обводку цветом фона (читаются на любом сегменте):

::: chart-example cone-funnel-labels

## Pyramid

Высота слоя пропорциональна значению; `reverse` переворачивает остриё вниз.

::: chart-example pyramid-basic

### Отступы и подписи внутри

`itemSpacing` разрезает пирамиду на слои; `label.placement: 'inside'` — подписи
в сегментах с автоконтрастным цветом:

::: chart-example pyramid-spacing

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                     | Серии                                 | По умолчанию                                | Описание                                                |
| ------------------------- | ------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `stageField`              | все                                   | —                                           | имя и значение стадии                                   |
| `valueField`              | все                                   | —                                           | имя и значение стадии                                   |
| `fills`                   | все                                   | палитра                                     | цвета стадий                                            |
| `itemSpacing`             | все                                   | funnel `4`, pyramid `0`                     | зазор между сегментами                                  |
| `widthRatio`              | все                                   | `0.62`                                      | доля ширины области под фигуру (не зависит от подписей) |
| `reverse`                 | pyramid                               | `false`                                     | остриё снизу                                            |
| `label.enabled`           | `boolean`                             | `true`                                      | подписи стадий                                          |
| `label.placement`         | `'inside' \| 'outside'`               | funnel `'inside'`; pyramid `'outside'`      | позиция (общая для всех сегментов)                      |
| `label.formatter`         | `({ datum, stage, value }) => string` | `стадия · значение`                         | содержимое                                              |
| `label.fontSize`          | `Pixels`                           | `12`                                        | шрифт                                                   |
| `label.fontWeight`        | `string \| number`                    | `normal`                                    | насыщенность                                            |
| `label.color`             | `ColorValue`                            | inside — автоконтраст; outside — foreground | цвет                                                    |
| `calloutLine.enabled`     | `boolean`                             | `true` при outside                          | линия к внешней подписи                                 |
| `calloutLine.length`      | `Pixels`                           | `14`                                        | длина линии                                             |
| `calloutLine.stroke`      | `ColorValue`                            | цвет сегмента                               | цвет линии                                              |
| `calloutLine.strokeWidth` | `Pixels`                           | `1`                                         | толщина                                                 |
