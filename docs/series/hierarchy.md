# Treemap

Hierarchical series without axes. Data is nested via `children`; a node's value is
the leaf's `sizeField` or the sum of its descendants.

## Treemap

Squarify layout: nested rectangles, groups with headers.

::: chart-example treemap-basic

### Tile labels and padding

`label` — same as for heatmap: `placement` (9 positions), `formatter`, font; the color
is chosen by auto-contrast against the tile. `itemPadding` — the gap between tiles:

::: chart-example treemap-labels

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option              | Series                                    | Default                               | Description         |
| ------------------- | ----------------------------------------- | ------------------------------------- | ------------------- |
| `groupHeaderHeight` | treemap                                   | `18`                                  | group header height |
| `fills`             | all                                       | palette                               | branch/layer colors |
| `itemPadding`       | treemap                                   | `2`                                   | gap between tiles   |
| `labelField`        | treemap                                   | `label`/`size`/`children`             | hierarchy keys      |
| `sizeField`         | treemap                                   | `label`/`size`/`children`             | hierarchy keys      |
| `childrenField`     | treemap                                   | `label`/`size`/`children`             | hierarchy keys      |
| `label.enabled`     | `boolean`                                 | `true`                                | show value labels   |
| `label.placement`   | `center`, edges and corners (9 positions) | `'center'`                            | label position      |
| `label.formatter`   | `({ datum, label, value }) => string`     | the value                             | label content       |
| `label.fontSize`    | `Pixels`                                  | `11`                                  | label font size     |
| `label.fontWeight`  | `string \| number`                        | `normal`                              | font weight         |
| `label.fontFamily`  | `string`                                  | theme font                            | font family         |
| `label.color`       | `ColorValue`                              | foreground; auto-contrast when inside | text color          |
