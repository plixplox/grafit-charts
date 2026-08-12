# Sankey and Chord

Flow series: edges `fromField → toField` weighted by `sizeField`.

## Sankey

Nodes are laid out in columns by topological depth; link thickness
is proportional to the flow.

::: chart-example sankey-basic

### Labels and node configuration

A node label is the name of the node and what flows through it, drawn as one
block: `label.category` is the name, `label.value` the number, each with its own
font, colour and format — the same shape a pie sector label takes. The name is
printed on its own until `value.enabled` asks for the number too, `layout` puts
the two on one line instead of two, and `label` itself carries the font both
halves fall back to. Alongside them, `node.width` / `node.spacing` and
`linkOpacity`:

::: chart-example sankey-labels

### Many nodes in a column

The value → px scale is set by the column that runs out of room first, not by
the heaviest one: the gaps between nodes are a fixed cost, so a column of twelve
nodes has eleven gaps to pay for before its values get any height. Where the gaps
alone would outgrow the plot, they shrink below `node.spacing` — every node keeps
at least a hairline, and the column stays inside the chart.

::: chart-example sankey-many-nodes

## Chord

Nodes around a circle, ribbons are the mutual flows.

::: chart-example chord-basic

### Spacing and labels

`nodeSpacing` — the gap between arcs (px along the inner radius), `linkOpacity` —
ribbon density. The label block is the sankey's: here the value half reads as a
share of the ring (`value.type: 'percent'`) rather than as the flow itself:

::: chart-example chord-spacing

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option      | Series | Description                             |
| ----------- | ------ | --------------------------------------- |
| `fromField` | both   | flow graph edges                        |
| `toField`   | both   | flow graph edges                        |
| `sizeField` | both   | flow graph edges                        |
| `fills`     | both   | node colors cycling through the palette |

### Full option list

| Option             | Type                          | Default    | Description               |
| ------------------ | ----------------------------- | ---------- | ------------------------- |
| `linkOpacity`      | both                          | `0.35`     | flow ribbon opacity       |
| `nodeSpacing`      | chord                         | `12`       | gap between node arcs, px |
| `label.enabled`    | `boolean`                     | `true`     | node labels               |
| `label.formatter`  | `({ name, total, share }) => string` | —   | the whole label at once; wins over `category`/`value` |
| `label.fontSize`   | `Pixels`                      | `11`       | font both halves fall back to |
| `label.fontWeight` | `string \| number`            | `normal`   | font weight               |
| `label.fontFamily` | `string`                      | theme font | font family               |
| `label.color`      | `ColorValue`                  | foreground | color                     |
| `label.layout`     | `'stacked' \| 'inline'`       | `'stacked'` | the two halves on two lines or one |
| `label.separator`  | `string`                      | `' · '`    | between the halves of an inline label |
| `label.category`   | `enabled`, font, `format`, `formatter` | on | the node name             |
| `label.value`      | `enabled`, `type`, font, `format`, `formatter` | off | what flows through the node |
| `label.value.type` | `'value' \| 'percent'`        | `'value'`  | the flow itself, or its share of the whole |
| `label.minShare`   | `Fraction`                    | `0`        | share a node needs before it is worth a label |
| `label.avoidOverlap` | `boolean`                   | `false`    | drop a label there is no room for |
| `node.width`       | `Pixels`                      | `14`       | sankey node width         |
| `node.spacing`     | `Pixels`                      | `14`       | sankey node vertical gap  |

The whole a share is taken against is what the node stands among: its own column
for a sankey node, the whole ring for a chord one. `minShare` reads the same
whole, so `0.02` leaves the slivers of a crowded column unlabelled.


## Tooltip and the name of a value

A node is not a row of the data — it is a name and what it adds up to — so
`tooltip.renderer` receives `NodeTooltipRendererParams`:
`{ datum?, label, value, share, color }`. `datum` is the row the node was read
from; a flow node is summed from several rows and has none.

```js
tooltip: { renderer: ({ label, value, share }) => `${label}: ${value} (${Math.round(share * 100)}%)` },
```

Without a renderer the row of the tooltip is named after the data key the value
came from — a column name, not the name of a measure. `name` on the series says
what it should be called instead:

```js
series: [{ type: 'treemap', sizeField: 'revenue', name: 'Revenue' }],
```
