# Events (listeners)

The `listeners` block in `ChartOptions` provides callbacks for user actions.
All events receive datum data, so the chart is easy to connect
to external UI: tables, filters, drill-down navigation.

::: chart-example listeners-basic

## All events

| Event             | Parameters                                                 | When it fires                                                 |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `nodeClick`       | `{ seriesId: string; datumIndex: number; datum: Datum }`   | click on a series node (bar, point, sector, cell…)            |
| `selectionChange` | `{ items: Array<{ seriesId; datumIndex; datum }> }`        | Data Selection change (clicks, box, reset)                    |
| `zoomChange`      | `{ x: [from, to]; y: [from, to] }` — domain fractions 0..1 | any zoom change: wheel, pan, box, navigator, reset            |
| `legendItemClick` | `{ seriesId: string; visible: boolean }`                   | click on a legend item (for pie sectors — `'seriesId#index'`) |

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
- `datum` is a reference to the original object from `data` (not a copy).
- To react to hover, use the [tooltip](/interactivity/tooltip) modes
  and `highlight`; there is no separate hover event.
