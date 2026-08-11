# Box Plot

Распределение по пяти статистикам на категорию: `minField`, `q1Field`, `medianField`, `q3Field`, `maxField`.

::: chart-example box-plot-basic

| Опция               | Тип        | По умолчанию | Описание                         |
| ------------------- | ---------- | ------------ | -------------------------------- |
| `xField`            | `string`   | —            | категория                        |
| `minField…maxField` | `string`   | —            | пять статистик                   |
| `fill`              | стили      | палитра      | заливка бокса                    |
| `fillOpacity`       | стили      | `0.45`       | заливка бокса                    |
| `stroke`            | стили      | цвет заливки | контуры и усы                    |
| `strokeWidth`       | стили      | `1.5`        | контуры и усы                    |
| `capLengthRatio`    | `Fraction` | `0.5`        | ширина «шапок» усов              |
| `groupGap`          | `Fraction` | `0.2`        | зазор между боксами одной группы |
| `q1Field`           | `string`   | —            | квартили и медиана               |
| `medianField`       | `string`   | —            | квартили и медиана               |
| `q3Field`           | `string`   | —            | квартили и медиана               |

## Стилизация

Цвета бокса, обводка и доля ширины усов (`capLengthRatio`):

::: chart-example box-plot-styled

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).
