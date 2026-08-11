# Data selection

`selection` enables datum selection: in `single` — by clicks (exactly one item), in `multiple` — by clicks and, with `boxSelect` enabled, with a box (drag); selected nodes
are highlighted and the rest are dimmed. Changes arrive in
`listeners.selectionChange`.

## Single

By default exactly one item is selected by click; the next click moves the selection (box selection is not available in single):

::: chart-example selection-bar-single

## Multiple

`mode: 'multiple'` accumulates the selection; clicking an already selected node deselects it:

::: chart-example selection-bar-multiple

## Box selection on a scatter series

Dragging draws a selection box; styles of selected and inactive items are configurable:

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

## Options

| Option                      | Type                                        | Default    | Description                                                                     |
| --------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `enabled`                   | `boolean`                                   | —          | enable selection                                                                |
| `mode`                      | `'single' \| 'multiple'`                    | `'single'` | single — selection is replaced; multiple — boxes accumulate, node click toggles |
| `boxSelect`                 | `boolean`                                   | `false`    | selection box by dragging (multiple only)                                       |
| `listeners.selectionChange` | `({ items }) => void`                       | —          | selection change                                                                |
| `listeners.nodeClick`       | `({ seriesId, datumIndex, datum }) => void` | —          | node click                                                                      |
| `itemStyle.stroke`          | `ColorValue`                                | foreground | stroke of selected nodes                                                        |
| `itemStyle.strokeWidth`     | `Pixels`                                    | `2`        | stroke width                                                                    |
| `itemStyle.sizeRatio`       | `number`                                    | `1.4–1.5`  | size multiplier for selected markers                                            |
| `inactiveOpacity`           | `Fraction`                                  | `0.45`     | opacity of unselected items while a selection is active                         |

Behavior:

- clicking an empty spot clears the selection;
- the box (`boxSelect: true`) works in `multiple` for Cartesian series (line, bar, area, scatter/bubble);
  polar series (pie/donut, sector-based) and stage series (funnel, cone-funnel, pyramid)
  are selected by clicks — a picked-out sector, stage or layer is outlined and the rest fade back;
- with `boxSelect` enabled, dragging in the plot area is given to selection — zoom
  with the wheel/pinch (`zoom.dragSelect` yields priority); without it, dragging stays with zoom.
