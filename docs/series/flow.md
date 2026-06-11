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

## Chord

Nodes around a circle, ribbons are the mutual flows.

::: chart-example chord-basic

### Spacing and labels

`nodeSpacing` — the gap between arcs (px along the inner radius), `linkOpacity` —
ribbon density, `label.formatter` receives the node's name and total:

::: chart-example chord-spacing

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option      | Series | Description                          |
| ----------- | ------ | ------------------------------------ |
| `fromField` | both   | flow graph edges                     |
| `toField`   | both   | flow graph edges                     |
| `sizeField` | both   | flow graph edges                     |
| `fills`     | both   | node colors cycling through the palette |

### Full option list

| Option             | Type                          | Default      | Description                       |
| ------------------ | ----------------------------- | ------------ | --------------------------------- |
| `linkOpacity`      | both                          | `0.35`       | flow ribbon opacity               |
| `nodeSpacing`      | chord                         | `12`         | gap between node arcs, px         |
| `label.enabled`    | `boolean`                     | `true`       | node labels                       |
| `label.formatter`  | `({ name, total }) => string` | node name    | content                           |
| `label.fontSize`   | `Pixels`                   | `11`         | label font size                   |
| `label.fontWeight` | `string \| number`            | `normal`     | font weight                       |
| `label.fontFamily` | `string`                      | theme font   | font family                       |
| `label.color`      | `ColorValue`                    | foreground   | color                             |
| `node.width`       | `Pixels`                   | `14`         | sankey node width                 |
| `node.spacing`     | `Pixels`                   | `14`         | sankey node vertical gap          |
