# Events (listeners)

The `listeners` block in `ChartOptions` provides callbacks for user actions.
All events receive datum data, so the chart is easy to connect
to external UI: tables, filters, drill-down navigation.

::: chart-example listeners-basic

## All events

| Event             | Parameters                                                  | When it fires                                                 |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `nodeClick`       | `{ seriesId; datumIndex; datum?; node? }`                   | click on a series node (bar, point, sector, cell…)            |
| `selectionChange` | `{ items: Array<{ seriesId; datumIndex; datum?; node? }> }` | Data Selection change (clicks, box, reset)                    |
| `zoomChange`      | `{ x: [from, to]; y: [from, to] }` — domain fractions 0..1  | any zoom change: wheel, pan, box, navigator, reset            |
| `legendItemClick` | `{ seriesId: string; visible: boolean }`                    | click on a legend item (for pie sectors — `'seriesId#index'`) |

## A node that is not a data row

Most series count data rows, and `datum` is the row that was clicked. A histogram
counts bars — bin by bin, group within bin — so there is no single row behind one:
`datum` is absent and `node` describes what was actually hit.

A hierarchy numbers every node it draws, nested ones included, so on a treemap or
a sunburst `datumIndex` counts nodes rather than rows of `data`. `datum` is still
the row the node was read from — the nested `children` object for an inner node,
which is what a drill-down needs.

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

`binEdges` is exported from the package, so a filter like this can use the very
edges the chart drew instead of recomputing them — see
[Histogram](/series/histogram#binning-outside-the-chart).

`selectionChange` fires only when
[`selection`](/interactivity/selection) is enabled; `zoomChange` — when
[`zoom`](/interactivity/zoom) or the navigator is enabled; `nodeClick` and `legendItemClick`
always work.

## Pattern: drill-down

On a category click, load the details and update the chart:

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

## Pattern: connecting to external UI

Selection on the chart drives a table next to it:

```ts
listeners: {
  selectionChange: ({ items }) => {
    table.setRowSelection(items.map((item) => item.datum.id));
  },
},
```

The reverse direction — driving the chart from the app — goes through the
[programmatic control](/interactivity/control) methods:
`chart.setSelection(targets, { silent: true })` selects from the table without
bouncing back into the listener above.

## Notes

- Callbacks are isolated leaves of options: the rest of the object is serializable.
- `datum` is a reference to the original object from `data` (not a copy), nested
  `children` rows of a hierarchy included.
- To react to hover, use the [tooltip](/interactivity/tooltip) modes
  and `highlight`; there is no separate hover event.
