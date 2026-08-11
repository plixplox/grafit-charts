# Sankey and Chord

Flow series: edges `fromField → toField` weighted by `sizeField`.

## Sankey

Nodes are laid out in columns by topological depth; link thickness
is proportional to the flow.

::: chart-example sankey-basic

### Labels and node configuration

`label` (font, color, `formatter({ name, total })`), `node.width`/`node.spacing`,
and `linkOpacity`:

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
ribbon density, `label.formatter` receives the node's name and total:

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
| `label.formatter`  | `({ name, total }) => string` | node name  | content                   |
| `label.fontSize`   | `Pixels`                      | `11`       | label font size           |
| `label.fontWeight` | `string \| number`            | `normal`   | font weight               |
| `label.fontFamily` | `string`                      | theme font | font family               |
| `label.color`      | `ColorValue`                  | foreground | color                     |
| `node.width`       | `Pixels`                      | `14`       | sankey node width         |
| `node.spacing`     | `Pixels`                      | `14`       | sankey node vertical gap  |


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
