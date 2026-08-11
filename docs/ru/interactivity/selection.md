# Выделение данных

`selection` включает выбор датумов: в `single` — кликами (ровно один элемент), в `multiple` — кликами и, при включённом `boxSelect`, рамкой (drag); выбранные узлы
подсвечиваются, остальные приглушаются. Изменения приходят в
`listeners.selectionChange`.

## Single

По умолчанию выбирается ровно один элемент кликом; следующий клик переносит выбор (рамка в single недоступна):

::: chart-example selection-bar-single

## Multiple

`mode: 'multiple'` накапливает выбор; клик по уже выбранному узлу снимает его:

::: chart-example selection-bar-multiple

## Рамка по точечной серии

Drag рисует рамку выделения; стили выбранных и неактивных настраиваются:

::: chart-example selection-basic

```ts
selection: { enabled: true, mode: 'multiple', boxSelect: true },
listeners: {
  selectionChange: ({ items }) => {
    // items: [{ seriesId, datumIndex, datum }]
  },
  nodeClick: ({ datum }) => console.log(datum),
},
```

## Опции

| Опция                       | Тип                                         | По умолчанию | Описание                                                                       |
| --------------------------- | ------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `enabled`                   | `boolean`                                   | —            | включить выделение                                                             |
| `mode`                      | `'single' \| 'multiple'`                    | `'single'`   | single — выбор заменяется; multiple — рамки накапливают, клик по узлу — toggle |
| `boxSelect`                 | `boolean`                                   | `false`      | рамка выделения перетаскиванием (только multiple)                              |
| `listeners.selectionChange` | `({ items }) => void`                       | —            | изменение выбора                                                               |
| `listeners.nodeClick`       | `({ seriesId, datumIndex, datum }) => void` | —            | клик по узлу                                                                   |
| `itemStyle.stroke`          | `ColorValue`                                | foreground   | обводка выбранных узлов                                                        |
| `itemStyle.strokeWidth`     | `Pixels`                                    | `2`          | толщина обводки                                                                |
| `itemStyle.sizeRatio`       | `number`                                    | `1.4–1.5`    | множитель размера выбранных маркеров                                           |
| `inactiveOpacity`           | `Fraction`                                  | `0.45`       | прозрачность невыбранных при активном выборе                                   |

Поведение:

- клик по пустому месту сбрасывает выбор;
- рамка (`boxSelect: true`) работает в `multiple` для декартовых серий (line, bar, area, scatter/bubble);
  полярные (pie/donut, секторные) и стадийные (funnel, cone-funnel, pyramid) выбираются
  кликами — выбранный сектор, стадия или слой получает обводку, остальные приглушаются;
- при включённом `boxSelect` drag в области построения отдан выделению — зумируйте
  колесом/pinch (`zoom.dragSelect` уступает приоритет); без него drag остаётся за зумом.
