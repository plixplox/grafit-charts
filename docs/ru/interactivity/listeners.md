# События (listeners)

Блок `listeners` в `ChartOptions` — колбэки на действия пользователя.
Все события получают данные датума, поэтому чарт легко связывается
с внешним UI: таблицами, фильтрами, drill-down-навигацией.

::: chart-example listeners-basic

## Все события

| Событие           | Параметры                                                   | Когда срабатывает                                                |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `nodeClick`       | `{ seriesId; datumIndex; datum?; node? }`                   | клик по узлу серии (бар, точка, сектор, ячейка…)                 |
| `selectionChange` | `{ items: Array<{ seriesId; datumIndex; datum?; node? }> }` | изменение выбора Data Selection (клики, рамка, сброс)            |
| `zoomChange`      | `{ x: [от, до]; y: [от, до] }` — доли домена 0..1           | любое изменение зума: колесо, пан, рамка, навигатор, сброс       |
| `legendItemClick` | `{ seriesId: string; visible: boolean }`                    | клик по элементу легенды (для секторов pie — `'seriesId#index'`) |

## Узел, который не является строкой данных

Большинство серий считает строки данных, и `datum` — та строка, по которой кликнули.
Гистограмма считает столбцы — корзина за корзиной, группа внутри корзины, — и одной
строки за ними нет: `datum` отсутствует, а `node` описывает то, во что попал клик.

```ts
listeners: {
  nodeClick: ({ datum, node }) => {
    if (node?.kind === 'bin') {
      // { kind: 'bin', x0: 100, x1: 125, value: 61, raw: 61, count: 61, group: 'Pro' }
      filterRows((row) => row.response >= node.x0! && row.response < node.x1!);
      return;
    }
    openDetails(datum);
  },
}
```

`binEdges` экспортируется из пакета, поэтому такой фильтр может использовать те же
границы, которые нарисовал график, а не пересчитывать их — см.
[Histogram](/ru/series/histogram#биннинг-за-пределами-графика).

`selectionChange` срабатывает только при включённом
[`selection`](/ru/interactivity/selection); `zoomChange` — при включённом
[`zoom`](/ru/interactivity/zoom) или навигаторе; `nodeClick` и `legendItemClick`
работают всегда.

## Паттерн: drill-down

По клику на категорию загружаем детализацию и обновляем чарт:

```ts
const chart = Charts.create({
  ...options,
  listeners: {
    nodeClick: async ({ datum }) => {
      const details = await fetchDetails(datum.category);
      chart.update({ ...detailOptions, data: details });
    },
  },
});
```

## Паттерн: связка с внешним UI

Выбор на чарте управляет таблицей рядом:

```ts
listeners: {
  selectionChange: ({ items }) => {
    table.setRowSelection(items.map((item) => item.datum.id));
  },
},
```

Обратное направление — управление чартом из приложения — через методы
[программного управления](/ru/interactivity/control):
`chart.setSelection(targets, { silent: true })` выделит из таблицы, не отскочив
обратно в листенер выше.

## Замечания

- Колбэки — изолированные листья options: остальной объект сериализуем.
- `datum` — ссылка на исходный объект из `data` (не копия).
- Для реакции на ховер используйте режимы [тултипа](/ru/interactivity/tooltip)
  и `highlight`; отдельного hover-события нет.
