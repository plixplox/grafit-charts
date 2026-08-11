# Programmatic control

`listeners` report what the user did; the methods on the chart instance do the
same things from code. They are not synthetic events — a call runs the very path
a hover or a click runs, so the listeners fire and the state changes exactly as
if the pointer had done it.

```ts
const chart = Charts.create(options);

chart.showTooltip({ datumIndex: 12 }); // hover a datum from a table row
chart.clickNode({ datumIndex: 12 }); // nodeClick + the selection a click makes
chart.setSelection([{ datumIndex: 3 }, { datumIndex: 7 }]);
chart.zoomToCount(30, { anchor: 'end' }); // show the last 30 points
```

## Methods

| Method                         | Returns          | What it does                                                   |
| ------------------------------ | ---------------- | -------------------------------------------------------------- |
| `showTooltip(target)`          | `boolean`        | tooltip + highlight on a datum, as hovering it would           |
| `hideTooltip()`                | —                | hides both, as leaving the plot does                           |
| `clickNode(target, opts?)`     | `boolean`        | `nodeClick` and the selection change a click causes            |
| `getSelection()`               | `SelectedNode[]` | current selection: `seriesId`, `datumIndex`, `datum`           |
| `setSelection(targets, opts?)` | —                | replaces the selection wholesale                               |
| `clearSelection(opts?)`        | —                | empties it                                                     |
| `isZoomed()`                   | `boolean`        | whether the window is narrower than the full domain            |
| `zoomTo(window, opts?)`        | —                | `{ x?: [from, to], y?: [from, to] }` — fractions of the domain |
| `zoomToCount(count, opts?)`    | —                | window of N items; `anchor: 'start' \| 'end'`                  |
| `resetZoom(opts?)`             | —                | back to the full domain                                        |

`target` is `{ datumIndex, seriesId? }`. Without a `seriesId` the visible series
answer in order — the first one holding a node for that index wins.

## Silent calls

Every call that changes something notifies the listeners by default. An app that
drives the chart from its own state usually does not want that: the listener
would push the change straight back and the two would ping-pong. Pass
`{ silent: true }`:

```ts
listeners: {
  selectionChange: ({ items }) => store.select(items.map((item) => item.datum.id)),
}

// applying the store back to the chart — without re-entering the listener
store.subscribe((ids) => chart.setSelection(ids.map(toTarget), { silent: true }));
```

`silent` covers the chart's own listeners and the [sync group](/interactivity/state)
broadcast alike, so a silent `zoomTo` does not move the charts it is synced with.

## What answers false

`showTooltip` and `clickNode` need a node that is actually on screen. They return
`false` when the datum is outside the current zoom window, belongs to a hidden
series, or simply does not exist — a return value worth checking before assuming
the tooltip is up. The selection is bookkeeping rather than geometry, so
`setSelection` accepts any index.

## Rendering

The calls schedule a frame the same way options updates do. Await
`waitForUpdate()` when the next line depends on the frame being on screen —
a screenshot, a measurement, an assertion in a test:

```ts
chart.showTooltip({ datumIndex: 4 });
await chart.waitForUpdate();
const png = chart.getImageDataURL();
```

## Not every chart has everything

A pie has no zoom, and neither has a treemap. Calling what a chart
kind does not have is a no-op with a one-off console warning rather than an
error, so an unsupported call never breaks a dashboard that shares code across
chart types.

| Chart kind              | Tooltip | Click and selection | Zoom |
| ----------------------- | ------- | ------------------- | ---- |
| cartesian               | ✓       | ✓                   | ✓    |
| pie, donut, polar       | ✓       | ✓                   | —    |
| treemap, sunburst, flow | ✓       | ✓                   | —    |
