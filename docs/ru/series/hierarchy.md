# Treemap

Иерархические серии без осей. Данные — вложенные через `children`; значение узла —
`sizeField` листа или сумма потомков.

## Treemap

Squarify-раскладка: вложенные прямоугольники, группы с заголовками.

::: chart-example treemap-basic

### Подписи и зазоры плиток

Подпись плитки собирается так же, как подпись сектора круговой: имя узла и его
величина — одна подпись из двух половин, у каждой свой шрифт и формат.
`label.value.enabled` включает число, `layout` ставит его на отдельную строку
(по умолчанию) или в ту же строку за разделителем, `placement` двигает весь блок
по 9 позициям внутри плитки. Цвет подбирается автоконтрастом по плитке.

`itemGap` — зазор между соседними плитками, `groupGap` — между соседними
группами. Только между ними: плитка на краю своей группы или всего графика этот
край сохраняет, поэтому отступы области построения остаются отступами области
построения. Без `groupGap` группы разделяет `itemGap`:

::: chart-example treemap-labels

Заголовки групп читают те же две половины, всегда в одну строку, — группа
называет свой итог так же, как плитки называют свой. Заголовок — это заглавие
над группой: полоса не закрашена, пока фон не запрошен через
`groupHeader.background`, а имя написано цветом самой группы — или
автоконтрастом по фону, когда он задан. В `groupHeader` же лежат высота полосы
и её шрифт, наследуемый от `label`. Подпись, не помещающаяся в плитку — как и
заглавие, не помещающееся в полосу, — не рисуется; `label.minShare` решает
раньше, какие узлы вообще стоит подписывать.

```js
series: [
  {
    type: 'treemap',
    itemGap: 3,
    groupGap: 10,
    groupHeader: { height: 22, fontSize: 13, background: '#f2f0ed' },
  },
],
```

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция               | Серии                                 | По умолчанию                      | Описание                  |
| ------------------- | ------------------------------------- | --------------------------------- | ------------------------- |
| `groupHeader.height` | treemap                              | `18`                              | высота заголовка группы   |
| `groupHeader.background` | treemap                          | нет                               | фон под заглавием         |
| `groupHeader.fontSize` | treemap                            | `label.fontSize`, затем `11`      | размер шрифта заглавия    |
| `groupHeader.fontWeight` | treemap                          | `label.fontWeight`, затем `bold`  | насыщенность заглавия     |
| `groupHeader.fontFamily` | treemap                          | `label.fontFamily`, затем шрифт темы | гарнитура заглавия     |
| `groupHeader.color` | treemap                               | цвет самой группы; автоконтраст по фону | цвет текста заглавия |
| `fills`             | все                                   | палитра                           | цвета ветвей/слоёв        |
| `itemGap`           | treemap                               | `2`                               | зазор между соседними плитками |
| `groupGap`          | treemap                               | `itemGap`                         | зазор между соседними группами |
| `labelField`        | treemap                               | `label`/`size`/`children`         | ключи иерархии            |
| `sizeField`         | treemap                               | `label`/`size`/`children`         | ключи иерархии            |
| `childrenField`     | treemap                               | `label`/`size`/`children`         | ключи иерархии            |
| `labelName`         | `Formattable<PartNameParams>`         | значение поля как есть            | как читается имя узла везде: легенда, подсказка, заголовок группы, подпись |
| `label.enabled`     | `boolean`                             | `true`                            | показать подписи значений |
| `label.placement`   | `center`, края и углы (9 позиций)     | `'center'`                        | позиция подписи           |
| `label.layout`      | `'stacked' \| 'inline'`               | `'stacked'`                       | величина на своей строке или за разделителем |
| `label.separator`   | `string`                              | `' · '`                           | между половинами подписи в одну строку |
| `label.minShare`    | `Fraction`                            | `0`                               | доля от целого, начиная с которой узел подписывается |
| `label.category`    | `Switchable & FontOptions & Formattable` | включена                       | половина с именем: свой шрифт и формат |
| `label.value`       | `PartValueLabelOptions`               | выключена                         | половина с величиной: `type: 'percent' \| 'value'`, `format`, `formatter`, свой шрифт |
| `label.formatter`   | `({ datum, label, value, share }) => string` | —                          | вся подпись целиком; побеждает `category`/`value` |
| `label.fontSize`    | `Pixels`                              | `11`                              | размер шрифта подписи     |
| `label.fontWeight`  | `string \| number`                    | `normal`                          | насыщенность              |
| `label.fontFamily`  | `string`                              | шрифт темы                        | гарнитура                 |
| `label.color`       | `ColorValue`                          | foreground; внутри — автоконтраст | цвет текста               |


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
