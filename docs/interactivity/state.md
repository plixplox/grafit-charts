# State, synchronization, export

## Chart state

Zoom and series hidden via the legend are serializable state:

```ts
const state = chart.getState();
// { zoom: { x: [0.25, 0.75] }, hiddenSeries: ['line-1', 'histogram-0#1'] }
localStorage.setItem('chart-state', JSON.stringify(state));

// restore — at creation time or on a live instance
Charts.create({ ...options, initialState: JSON.parse(saved) });
await chart.setState(JSON.parse(saved));
```

`hiddenSeries` also holds the items of a series that puts several in the legend —
pie/donut sectors and histogram groups, as `'seriesId#index'`. They are restored
with everything else, and because series are rebuilt on every `update()`, this is
what keeps a legend filter from evaporating the next time the options change.

## Chart synchronization

Charts with the same `sync.groupId` share node highlighting and the zoom window:

```ts
Charts.create({ ...top, sync: { groupId: 'dashboard' } });
Charts.create({ ...bottom, sync: { groupId: 'dashboard' } });
```

| Option            | Default     | Description                               |
| ----------------- | ----------- | ----------------------------------------- |
| `groupId`         | `'default'` | group name                                |
| `nodeInteraction` | `true`      | highlight synchronization (by data index) |
| `zoom`            | `true`      | zoom window synchronization               |

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), synchronization is a separate module: `register(syncModule)`.
:::

## Context menu

`contextMenu: { enabled: true }` — right click opens a menu: "Download PNG",
"Reset zoom" (when zoom is present), and `extraItems: [{ label, action }]`.
When building with [grafit-charts/core](/guide/bundle), it is a separate module: `register(contextMenuModule)`.

## Export

```ts
chart.download({ fileName: 'report.png' });
const dataUrl = chart.getImageDataURL();
```

## Animation

Series entrance is animated by default (600 ms, ease-out). On `update`/`updateDelta`
the new data flows into place instead of replacing what is drawn: rows are matched,
their numeric fields walk to the new values, and the axes travel along with them.
A tooltip open while this happens keeps its node and its numbers keep up.

Rows are matched by position, so a change in how many there are is drawn at once.
Name a `key` — the field a row is the same row by — and the rows that stayed keep
flowing however many arrived or left: an entering row grows out of the base of its
value fields and opens a band of its own, a leaving one sinks back and closes its
band behind it, so the categories beside it spread rather than snap into the room.

The value axis walks to its new bounds along with the data instead of being read
off rows still in motion — its ticks stay the round numbers of the settled scale,
and nothing on the chart jumps when the scale changes gear.

```ts
chart.update({ ...options, data: next, animation: { key: 'month', updateDuration: 300 } });
```

Press for a new reading — the bars walk to their new heights, and a service that
drops out sinks away while the one taking its place grows in:

::: chart-example bar-live

`animation: { enabled: false }` switches both animations off. `updateEnabled` speaks
for the update alone and wins wherever it is set, so a chart can appear at once and
move afterwards. `update()` resolves when the transition has arrived, and so does
`waitForUpdate()`.

## Options

| Option                     | Type                                  | Default              | Description                          |
| -------------------------- | ------------------------------------- | -------------------- | ------------------------------------ |
| `animation.enabled`        | `boolean`                             | `true`               | entrance and update animation        |
| `animation.duration`       | `number`                              | `600`                | entrance duration, ms                |
| `animation.updateEnabled`  | `boolean`                             | `animation.enabled`  | the update transition on its own     |
| `animation.updateDuration` | `number`                              | `duration`, else 450 | update transition duration, ms       |
| `animation.key`            | `string \| (datum, index) => unknown` | —                    | what a row is the same row by        |
| `contextMenu.enabled`      | `boolean`                             | `true`               | right-click menu                     |
| `contextMenu.extraItems`   | `{ label, action }[]`                 | —                    | custom items after the standard ones |
| `download(options)`        | `{ fileName?, fileFormat? }`          | `chart.png`          | PNG/JPEG export                      |
| `initialState`             | `ChartState`                          | —                    | initial zoom and hidden series       |
