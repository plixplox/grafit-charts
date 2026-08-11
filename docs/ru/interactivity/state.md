# Состояние, синхронизация, экспорт

## Состояние чарта

Зум и скрытые легендой серии — сериализуемое состояние:

```ts
const state = chart.getState();
// { zoom: { x: [0.25, 0.75] }, hiddenSeries: ['line-1', 'histogram-0#1'] }
localStorage.setItem('chart-state', JSON.stringify(state));

// восстановление — при создании или на живом инстансе
Charts.create({ ...options, initialState: JSON.parse(saved) });
await chart.setState(JSON.parse(saved));
```

В `hiddenSeries` попадают и элементы серии, которая кладёт в легенду несколько
пунктов, — секторы pie/donut и группы гистограммы, в виде `'seriesId#index'`. Они
восстанавливаются вместе со всем остальным, и, поскольку серии пересобираются на
каждом `update()`, именно это не даёт фильтру легенды слетать при любой правке опций.

## Синхронизация чартов

Чарты с одним `sync.groupId` разделяют подсветку узлов и окно зума:

```ts
Charts.create({ ...top, sync: { groupId: 'dashboard' } });
Charts.create({ ...bottom, sync: { groupId: 'dashboard' } });
```

| Опция             | По умолчанию | Описание                                    |
| ----------------- | ------------ | ------------------------------------------- |
| `groupId`         | `'default'`  | имя группы                                  |
| `nodeInteraction` | `true`       | синхронизация подсветки (по индексу данных) |
| `zoom`            | `true`       | синхронизация окна зума                     |

::: tip Модульная сборка
В сборке через [grafit-charts/core](/ru/guide/bundle) синхронизация — отдельный модуль: `register(syncModule)`.
:::

## Контекстное меню

`contextMenu: { enabled: true }` — правый клик открывает меню: «Скачать PNG»,
«Сбросить зум» (когда есть зум) и `extraItems: [{ label, action }]`.
В сборке через [grafit-charts/core](/ru/guide/bundle) — отдельный модуль: `register(contextMenuModule)`.

## Экспорт

```ts
chart.download({ fileName: 'report.png' });
const dataUrl = chart.getImageDataURL();
```

## Анимация

Появление серий анимируется по умолчанию (600 мс, ease-out). При `update`/`updateDelta`
с данными той же длины числовые поля плавно интерполируются к новым значениям.
`animation: { enabled: false }` отключает, `duration` меняет длительность.

## Опции

| Опция                    | Тип                          | По умолчанию | Описание                      |
| ------------------------ | ---------------------------- | ------------ | ----------------------------- |
| `animation.enabled`      | `boolean`                    | `true`       | анимация входа и обновлений   |
| `animation.duration`     | `number`                     | `600`        | длительность появления, мс    |
| `contextMenu.enabled`    | `boolean`                    | `true`       | меню по правому клику         |
| `contextMenu.extraItems` | `{ label, action }[]`        | —            | свои пункты после стандартных |
| `download(options)`      | `{ fileName?, fileFormat? }` | `chart.png`  | экспорт PNG/JPEG              |
| `initialState`           | `ChartState`                 | —            | стартовый зум и скрытые серии |
