# Sunburst

Кольца по уровням вложенности, угол пропорционален значению. Данные — вложенные
через `children`; значение узла — `sizeField` листа или сумма потомков.

Каждое кольцо ветви несёт цвет этой ветви в полную силу: сектор дальше от центра
глубже, а не бледнее, — а одно кольцо от другого отделяет зазор между ними. При
наведении сектор подтягивается к собственному контрастному цвету, вместо того
чтобы гасить остальные, — как плитка в treemap.

::: chart-example sunburst-basic

## Отступы и скругление

`sectorSpacing` — зазор постоянной ширины между секторами (как у pie),
`cornerRadius` — скругление углов:

::: chart-example sunburst-spacing

## Подписи секторов

`label: { enabled: true }` выводит подписи в секторах, в которые они помещаются;
цвет — автоконтраст, `formatter` получает `label`, `value` и `depth`:

::: chart-example sunburst-labels

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция              | Тип                                   | По умолчанию                     | Описание                                |
| ------------------ | ------------------------------------- | -------------------------------- | --------------------------------------- |
| `labelField`       | `string`                              | `label`/`size`/`children`        | ключи иерархии                          |
| `sizeField`        | `string`                              | `label`/`size`/`children`        | ключи иерархии                          |
| `childrenField`    | `string`                              | `label`/`size`/`children`        | ключи иерархии                          |
| `fills`            | `ColorValue[]`                        | палитра                          | цвета ветвей                            |
| `sectorSpacing`    | `Pixels`                              | `0`                              | зазор постоянной ширины между секторами |
| `cornerRadius`     | `Pixels`                              | `0`                              | скругление углов секторов               |
| `stroke`           | стили                                 | фоновая `1px` при нулевом зазоре | обводка секторов                        |
| `strokeWidth`      | стили                                 | фоновая `1px` при нулевом зазоре | обводка секторов                        |
| `label.enabled`    | `boolean`                             | `false`                          | подписи секторов (если помещаются)      |
| `label.formatter`  | `({ label, value, depth }) => string` | имя узла                         | содержимое                              |
| `label.fontSize`   | `Pixels`                              | `11`                             | размер шрифта подписи                   |
| `label.fontWeight` | `string \| number`                    | `normal`                         | насыщенность                            |
| `label.fontFamily` | `string`                              | шрифт темы                       | гарнитура                               |
| `label.color`      | `ColorValue`                          | автоконтраст                     | цвет (ореол цвета сектора)              |


## Подсказка и имя величины

Узел — не строка данных, а имя и то, во что оно складывается, поэтому
`tooltip.renderer` получает `NodeTooltipRendererParams`:
`{ datum?, label, value, share, color }`. `datum` — строка, из которой прочитан
узел; узел потока сложен из нескольких строк, и своей у него нет.

```js
tooltip: { renderer: ({ label, value, share }) => `${label}: ${value} (${Math.round(share * 100)}%)` },
```

Без рендерера строка подсказки называется по ключу поля, откуда взята величина, —
это имя колонки, а не имя меры. `name` у серии говорит, как её называть:

```js
series: [{ type: 'treemap', sizeField: 'revenue', name: 'Выручка' }],
```
