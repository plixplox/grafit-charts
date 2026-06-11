# Heatmap

Категории по обеим осям, значение `colorField` задаёт цвет ячейки по непрерывной шкале.
Справа автоматически появляется градиентная легенда.

По умолчанию оси heatmap рисуются без линий, тиков и сетки — остаются только
подписи категорий (вернуть можно через `axes: [{ ..., line: { enabled: true } }]`).

::: chart-example heatmap-basic

## Расположение цветовой шкалы

`gradientLegend` управляет позицией, отступом и толщиной шкалы
(в сборке через [grafit-charts/core](/ru/guide/bundle) шкала — отдельный модуль:
`register(gradientLegendModule)`):

::: chart-example heatmap-legend-bottom

| Опция                      | Тип                   | По умолчанию | Описание                     |
| -------------------------- | --------------------- | ------------ | ---------------------------- |
| `gradientLegend.enabled`   | `boolean`             | `true`       | показывать шкалу             |
| `gradientLegend.position`  | `'right' \| 'bottom'` | `'right'`    | сторона размещения           |
| `gradientLegend.spacing`   | `Pixels`           | `10`         | отступ от области построения |
| `gradientLegend.thickness` | `Pixels`           | `12`         | толщина полосы               |

## Подписи значений

`label: { enabled: true }` выводит значение в каждой ячейке; цвет текста
подбирается автоматически по светимости фона. Тултип здесь привязан к центру
ячейки (`tooltip.position.anchorTo: 'center'`, по умолчанию — верхний край):

::: chart-example heatmap-labels

## Кастомные подписи

`formatter`, шрифт, цвет и размещение (`placement: 'top'`) настраиваются; шкалу можно отключить:

::: chart-example heatmap-labels-custom

| Опция              | Тип                               | По умолчанию                      | Описание                   |
| ------------------ | --------------------------------- | --------------------------------- | -------------------------- |
| `xField`           | `string`                          | —                                 | категории по осям          |
| `yField`           | `string`                          | —                                 | категории по осям          |
| `colorField`       | `string`                          | —                                 | числовое значение → цвет   |
| `colorRange`       | `ColorValue[]`                      | сине-голубая                      | стопы шкалы (2+)           |
| `itemPadding`      | `Pixels`                       | `1`                               | зазор между ячейками       |
| `cornerRadius`     | `Pixels`                       | `2`                               | скругление ячеек           |
| `colorName`        | `string`                          | имя `colorField`                  | подпись значения в тултипе |
| `label.enabled`    | `boolean`                         | `false`                           | показать подписи значений  |
| `label.placement`  | `center`, края и углы (9 позиций) | `'center'`                        | позиция подписи            |
| `label.formatter`  | `({ value, datum }) => string`    | значение                          | содержимое подписи         |
| `label.fontSize`   | `Pixels`                       | `11`                              | размер шрифта подписи      |
| `label.fontWeight` | `string \| number`                | `normal`                          | насыщенность               |
| `label.fontFamily` | `string`                          | шрифт темы                        | гарнитура                  |
| `label.color`      | `ColorValue`                        | foreground; внутри — автоконтраст | цвет текста                |

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).
