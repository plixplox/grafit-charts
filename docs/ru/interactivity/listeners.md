# События (listeners)

Блок `listeners` в `ChartOptions` — колбэки на действия пользователя.
Все события получают данные датума, поэтому чарт легко связывается
с внешним UI: таблицами, фильтрами, drill-down-навигацией.

::: chart-example listeners-basic

## Все события

| Событие           | Параметры                                                | Когда срабатывает                                                |
| ----------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `nodeClick`       | `{ seriesId: string; datumIndex: number; datum: Datum }` | клик по узлу серии (бар, точка, сектор, ячейка…)                 |
| `selectionChange` | `{ items: Array<{ seriesId; datumIndex; datum }> }`      | изменение выбора Data Selection (клики, рамка, сброс)            |
| `zoomChange`      | `{ x: [от, до]; y: [от, до] }` — доли домена 0..1        | любое изменение зума: колесо, пан, рамка, навигатор, сброс       |
| `legendItemClick` | `{ seriesId: string; visible: boolean }`                 | клик по элементу легенды (для секторов pie — `'seriesId#index'`) |

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

Обратное направление — через [`getState`/`setState`](/ru/interactivity/state)
или `updateDelta`.

## Замечания

- Колбэки — изолированные листья options: остальной объект сериализуем.
- `datum` — ссылка на исходный объект из `data` (не копия).
- Для реакции на ховер используйте режимы [тултипа](/ru/interactivity/tooltip)
  и `highlight`; отдельного hover-события нет.
