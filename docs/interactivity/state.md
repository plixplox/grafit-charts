# State, synchronization, export

## Chart state

Zoom and series hidden via the legend are serializable state:

```ts
const state = chart.getState();
// { zoom: { x: [0.25, 0.75] }, hiddenSeries: ['line-1'] }
localStorage.setItem('chart-state', JSON.stringify(state));

// restore — at creation time or on a live instance
Charts.create({ ...options, initialState: JSON.parse(saved) });
await chart.setState(JSON.parse(saved));
```

## Chart synchronization

Charts with the same `sync.groupId` share node highlighting and the zoom window:

```ts
Charts.create({ ...top, sync: { groupId: 'dashboard' } });
Charts.create({ ...bottom, sync: { groupId: 'dashboard' } });
```

| Option            | Default      | Description                                        |
| ----------------- | ------------ | -------------------------------------------------- |
| `groupId`         | `'default'`  | group name                                         |
| `nodeInteraction` | `true`       | highlight synchronization (by data index)          |
| `zoom`            | `true`       | zoom window synchronization                        |

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
with data of the same length, numeric fields are smoothly interpolated to the new values.
`animation: { enabled: false }` disables it, `duration` changes the duration.

## Options

| Option                   | Type                         | Default      | Description                          |
| ------------------------ | ---------------------------- | ------------ | ------------------------------------ |
| `animation.enabled`      | `boolean`                    | `true`       | entrance and update animation        |
| `animation.duration`     | `number`                     | `600`        | entrance duration, ms                |
| `contextMenu.enabled`    | `boolean`                    | `true`       | right-click menu                     |
| `contextMenu.extraItems` | `{ label, action }[]`        | —            | custom items after the standard ones |
| `download(options)`      | `{ fileName?, fileFormat? }` | `chart.png`  | PNG/JPEG export                      |
| `initialState`           | `ChartState`                 | —            | initial zoom and hidden series       |
