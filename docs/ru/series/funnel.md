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

### Из чего состоит подпись

Подпись стадии — это имя стадии и её значение, нарисованные одним блоком, чтобы
читались вместе: та же подпись, что и у сектора круговой. У каждой половины свой
шрифт, `layout` решает, идёт ли значение следом за именем (`'inline'` — по
умолчанию, через `separator`) или на своей строке (`'stacked'`), а
`value.type: 'percent'` превращает число в долю от всей воронки:

```js
label: {
  placement: 'outside',
  layout: 'stacked',
  category: { fontWeight: 'bold' },
  value: { type: 'percent', fontSize: 11, color: '#8a8f98' },
},
```

::: chart-example funnel-label-parts

Имя стадии приходит из поля данных, а у поля формат такой же, как у любого
другого — дата со своей гранулярностью, код со своими словами. `stageName`
задаёт, как это значение превращается в текст, один раз на всю серию: легенда,
заголовок тултипа и половина подписи с именем читаются одинаково. Принимаются
обе половины контракта — `format`, сериализуемая строка, переживающая сохранение
конфига, и `formatter` — для того, что строкой не выразить:

```js
stageName: { formatter: ({ datum, value }) => formatWeek(value) },
```

Там, где подписи нужно что-то короче легенды, у `label.category` есть свой
формат, и он перекрывает `stageName` — ради этого он и существует. За имя он
отвечает ровно так же, как `value.format`/`value.formatter` — за число, а его
форматтер получает те же `{ datum, stage, value, share }`:

```js
label: { category: { format: '%d.%m.%Y' }, value: { type: 'percent' } },
```

Каждая половина может остаться одна: `category: { enabled: false }` оставит голое
число, `value: { enabled: false }` — только имя. `label.formatter` по-прежнему
говорит за всю подпись, когда нужен один текст, и имеет приоритет над
`category`/`value`.

### Длинный хвост тонких стадий

Подпись получает каждая стадия, какой бы тонкой она ни была, — в тесноте подписи
просто накладываются. Прореживают их те же две опции, что и у круговых, и отвечают
они на разные вопросы.

`label.minShare` решает, какие стадии вообще достойны подписи: ниже этой доли от
суммы стадия рисуется, но остаётся без подписи — то, к чему сужается воронка,
сохраняет выноску, а хвост остаётся в фигуре и в тултипе.

::: chart-example funnel-significant

`label.avoidOverlap` решает, есть ли для подписи место: первыми просят самые
крупные стадии, поэтому зажатая по высоте воронка теряет подписи тонких стадий,
а не последних.

Опции складываются: `minShare` отбирает стадии, достойные подписи, `avoidOverlap`
гарантирует, что оставшиеся не столкнутся.

### Тултип

Тултип по умолчанию показывает значение стадии с её долей от всей воронки.
`tooltip.renderer` серии получает `datum` целиком — в тултип можно выводить
любые поля:

```js
tooltip: {
  renderer: ({ datum, stage, value, color }) => ({
    heading: stage,
    rows: [{ label: 'Пользователи', value: `${value} из ${datum.target}`, color }],
  }),
}
```

## Pyramid

Высота слоя пропорциональна значению; `reverse` переворачивает остриё вниз.

::: chart-example pyramid-basic

### Отступы и подписи внутри

`itemSpacing` разрезает пирамиду на слои; `label.placement: 'inside'` — подписи
в сегментах с автоконтрастным цветом:

::: chart-example pyramid-spacing

### Из чего состоит подпись

Слой пирамиды получает такую же блочную подпись, как стадия воронки: имя и
значение, у каждого свой шрифт, `layout: 'stacked'` уводит значение на отдельную
строку, а `value: { type: 'percent' }` читает его как долю от суммы.

```js
label: { placement: 'inside', layout: 'stacked', value: { type: 'percent' } },
```

### Подписи ближе к вершине

К вершине слои утончаются, и их подписям первым не хватает места. `label.minShare`
оставляет самые тонкие слои без подписи, `label.avoidOverlap` раздаёт оставшееся
место сначала самым толстым слоям:

::: chart-example pyramid-crowded

## Выделение

Стадии и слои выбираются кликами так же, как секторы круговых: выбранный сегмент
получает обводку, остальные приглушаются, пока выбор активен. `listeners.nodeClick`
и `listeners.selectionChange` работают как везде, выбором можно управлять из кода
(`chart.setSelection`, `chart.clickNode`) — см. [Выделение](/ru/interactivity/selection).

```js
selection: { enabled: true, mode: 'multiple' },
listeners: { selectionChange: ({ items }) => console.log(items) },
```

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция                      | Серии                                   | По умолчанию                                | Описание                                                                      |
| -------------------------- | --------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `stageField`               | все                                     | —                                           | имя и значение стадии                                                         |
| `stageName.format`         | `string`                                | —                                           | как поле имени стадии становится текстом: легенда, заголовок тултипа, подпись |
| `stageName.formatter`      | `({ datum, value }) => string`          | —                                           | то же, когда строкой формата не выразить                                      |
| `valueField`               | все                                     | —                                           | имя и значение стадии                                                         |
| `fills`                    | все                                     | палитра                                     | цвета стадий                                                                  |
| `itemSpacing`              | все                                     | funnel `4`, pyramid `0`                     | зазор между сегментами                                                        |
| `widthRatio`               | все                                     | `0.62`                                      | доля ширины области под фигуру (не зависит от подписей)                       |
| `reverse`                  | pyramid                                 | `false`                                     | остриё снизу                                                                  |
| `label.enabled`            | `boolean`                               | `true`                                      | подписи стадий                                                                |
| `label.placement`          | `'inside' \| 'outside'`                 | funnel `'inside'`; pyramid `'outside'`      | позиция (общая для всех сегментов)                                            |
| `label.formatter`          | `({ datum, stage, value }) => string`   | —                                           | вся подпись сразу; приоритет над category/value                               |
| `label.layout`             | `'inline' \| 'stacked'`                 | `'inline'`                                  | значение через разделитель или на своей строке                                |
| `label.separator`          | `string`                                | `' · '`                                     | разделитель половин inline-подписи                                            |
| `label.category.enabled`   | `boolean`                               | `true`                                      | имя стадии как часть подписи                                                  |
| `label.category.format`    | `string`                                | —                                           | строка формата для поля имени (`'%d.%m.%Y'`, `',.0f'`)                        |
| `label.category.formatter` | `({ datum, stage, value, share }) => …` | —                                           | текст половины с именем                                                       |
| `label.category.format`    | `string`                                | —                                           | строка формата для поля имени (`'%d.%m.%Y'`, `',.0f'`)                        |
| `label.category.formatter` | `({ datum, stage, value, share }) => …` | —                                           | текст половины с именем                                                       |
| `label.category.*`         | `FontOptions`                           | шрифт подписи                               | шрифт имени                                                                   |
| `label.value.enabled`      | `boolean`                               | `true`                                      | значение как часть подписи                                                    |
| `label.value.type`         | `'value' \| 'percent'`                  | `'value'`                                   | само значение или его доля от суммы                                           |
| `label.value.format`       | `string`                                | —                                           | строка формата (`',.0f'`, `'.1%'`)                                            |
| `label.value.formatter`    | `({ datum, stage, value, share }) => …` | —                                           | текст половины со значением                                                   |
| `label.value.*`            | `FontOptions`                           | шрифт подписи                               | шрифт значения                                                                |
| `label.fontSize`           | `Pixels`                                | `12`                                        | шрифт                                                                         |
| `label.fontWeight`         | `string \| number`                      | `normal`                                    | насыщенность                                                                  |
| `label.color`              | `ColorValue`                            | inside — автоконтраст; outside — foreground | цвет                                                                          |
| `label.minShare`           | `Fraction`                              | `0`                                         | доля от суммы, начиная с которой стадия достойна подписи                      |
| `label.avoidOverlap`       | `boolean`                               | `false`                                     | скрывать подписи, которым не хватило места                                    |
| `calloutLine.enabled`      | `boolean`                               | `true` при outside                          | линия к внешней подписи                                                       |
| `calloutLine.length`       | `Pixels`                                | `14`                                        | длина линии                                                                   |
| `calloutLine.stroke`       | `ColorValue`                            | цвет сегмента                               | цвет линии                                                                    |
| `calloutLine.strokeWidth`  | `Pixels`                                | `1`                                         | толщина                                                                       |
| `tooltip.renderer`         | `({ datum, stage, value, color }) => …` | —                                           | кастомный тултип                                                              |
