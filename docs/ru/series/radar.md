# Radar

Категории распределяются по кругу (`angleField`), значения — по радиусу (`radiusField`).
`radar-line` — контур, `radar-area` — контур с заливкой. Сетка — полигональная
(«паутина»). При наведении маркер вершины плавно увеличивается, остальные серии
приглушаются — анимация как у круговых.

::: chart-example radar-basic

## Radar-area

Заливка профилей с прозрачностью — удобно для сравнения двух контуров:

::: chart-example radar-area

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                      | Тип                                                 | По умолчанию  | Описание                     |
| -------------------------- | --------------------------------------------------- | ------------- | ---------------------------- |
| `angleField`               | `string`                                            | —             | ключи данных                 |
| `radiusField`              | `string`                                            | —             | ключи данных                 |
| `name`                     | `string`                                            | `radiusField` | имя серии                    |
| `stroke`                   | `ColorValue`                                          | палитра       | контур                       |
| `strokeWidth`              | `Pixels`                                         | `2`           | контур                       |
| `fillOpacity` (radar-area) | `Fraction`                                             | `0.25`        | прозрачность заливки         |
| `tooltip.renderer`         | `({ datum, label, value, seriesName, color }) => …` | —             | кастомное содержимое тултипа |
| `marker.enabled`           | `boolean`                                           | `true`        | маркеры вершин               |
| `marker.shape`             | `MarkerShape`                                       | `circle`      | форма                        |
| `marker.size`              | `Pixels`                                         | `6`           | размер                       |
