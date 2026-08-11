# Common Series Options

These options are available on all (or nearly all) series types and are not
repeated in the tables on individual series pages.

| Option             | Type                                       | Default        | Description                                                                              |
| ------------------ | ------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------- |
| `id`               | `string`                                   | auto-generated | stable series identifier (events, sync)                                                  |
| `xField`           | `string`                                   | —              | data keys (specialized series have their own: `angleField`, `sizeField`, `openField`, …) |
| `yField`           | `string`                                   | —              | data keys (specialized series have their own: `angleField`, `sizeField`, `openField`, …) |
| `name`             | `string`                                   | field name     | display name of the series (legend, tooltip)                                             |
| `xName`            | `string`                                   | —              | label for the X field in the tooltip                                                     |
| `visible`          | `boolean`                                  | `true`         | initial series visibility                                                                |
| `showInLegend`     | `boolean`                                  | `true`         | show in the legend                                                                       |
| `tooltip.enabled`  | `boolean`                                  | `true`         | tooltip for the series' nodes                                                            |
| `tooltip.renderer` | `(params) => string \| TooltipContentData` | —              | custom tooltip content; params depend on the series type                                 |

Chart-level blocks (`legend`, `tooltip`, `highlight`, `zoom`, `selection`,
`gradientLegend`, `animation`, …) are covered on the pages of the
“Interactivity” section and in the API reference (the Reference section).

## Value labels (`label`)

A uniform structure shared by line/area/scatter/bubble/bar/histogram/range-bar/
waterfall/heatmap/treemap/funnel/pyramid/sunburst/sankey/chord:

| Sub-option     | Type                  | Default                                       | Description                              |
| -------------- | --------------------- | --------------------------------------------- | ---------------------------------------- |
| `enabled`      | `boolean`             | `false` (funnel/pyramid/treemap — on)         | show labels                              |
| `placement`    | depends on the series | `top` (heatmap/treemap — `center`)            | label position                           |
| `formatter`    | `(params) => string`  | the value                                     | content; params depend on the series     |
| `avoidOverlap` | `boolean`             | `false`                                       | drop labels that collide with each other |
| `fontSize`     | `Pixels`              | `11` (funnel/pyramid — `12`)                  | font size                                |
| `fontWeight`   | `string \| number`    | `normal`                                      | font weight                              |
| `fontFamily`   | `string`              | theme font                                    | typeface                                 |
| `color`        | `ColorValue`          | foreground; inside an element — auto-contrast | text color                               |

Labels inside elements (`inner-*` bars, cells, tiles, sectors, bubble
`inside`) get a halo in the element's color. Placements per series type, the
drawing order and overlap handling are covered on the
[Value labels](/guide/labels) page.

## Markers (`marker`)

Available on line, area and radar series:

| Sub-option    | Type          | Default                           | Description  |
| ------------- | ------------- | --------------------------------- | ------------ |
| `enabled`     | `boolean`     | line — on, area — off, radar — on | show markers |
| `shape`       | `MarkerShape` | `circle`                          | shape        |
| `size`        | `Pixels`      | `7` (radar — `6`)                 | size         |
| `fill`        | `ColorValue`  | series color                      | fill         |
| `stroke`      | styles        | background                        | stroke       |
| `strokeWidth` | styles        | `1.5`                             | stroke       |
