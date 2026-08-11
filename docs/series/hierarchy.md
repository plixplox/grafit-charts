# Treemap

Hierarchical series without axes. Data is nested via `children`; a node's value is
the leaf's `sizeField` or the sum of its descendants.

## Treemap

Squarify layout: nested rectangles, groups with headers.

::: chart-example treemap-basic

### Tile labels and gaps

A tile label is put together the way a pie sector's is: the name of the node and
its value are one label of two halves, each with its own font and format.
`label.value.enabled` turns the number on, `layout` puts it on its own line
(default) or behind a separator in the same row, and `placement` moves the whole
block to one of 9 spots in the tile. The color is chosen by auto-contrast
against the tile.

`itemGap` is the gap between neighbouring tiles and `groupGap` the gap between
neighbouring groups — between them only: a tile on the edge of its group, or of
the chart, keeps that edge, so the padding of the plot stays the padding of the
plot. `groupGap` falls back to `itemGap` when it is not given:

::: chart-example treemap-labels

Group headers read the same two halves, always in one row, so a group states its
total the same way its tiles state theirs. A header is a heading over its group:
the strip is unpainted until `groupHeader.background` asks for a fill, and the
name is written in the color of the group — or in auto-contrast against the fill
once there is one. `groupHeader` also carries the height of the strip and its
font, falling back to `label`'s. A label that does not fit its tile — or a
heading that does not fit its strip — is not drawn; `label.minShare` decides
earlier which nodes are worth a label at all.

```js
series: [
  {
    type: 'treemap',
    itemGap: 3,
    groupGap: 10,
    groupHeader: { height: 22, fontSize: 13, background: '#f2f0ed' },
  },
],
```

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option              | Series                                    | Default                               | Description         |
| ------------------- | ----------------------------------------- | ------------------------------------- | ------------------- |
| `groupHeader.height` | treemap                                  | `18`                                  | group header height |
| `groupHeader.background` | treemap                              | none                                  | fill behind the heading |
| `groupHeader.fontSize` | treemap                                | `label.fontSize`, then `11`           | heading font size   |
| `groupHeader.fontWeight` | treemap                              | `label.fontWeight`, then `bold`       | heading font weight |
| `groupHeader.fontFamily` | treemap                              | `label.fontFamily`, then theme font   | heading font family |
| `groupHeader.color` | treemap                                   | the color of the group; auto-contrast over a fill | heading text color |
| `fills`             | all                                       | palette                               | branch/layer colors |
| `itemGap`           | treemap                                   | `2`                                   | gap between neighbouring tiles |
| `groupGap`          | treemap                                   | `itemGap`                             | gap between neighbouring groups |
| `labelField`        | treemap                                   | `label`/`size`/`children`             | hierarchy keys      |
| `sizeField`         | treemap                                   | `label`/`size`/`children`             | hierarchy keys      |
| `childrenField`     | treemap                                   | `label`/`size`/`children`             | hierarchy keys      |
| `labelName`         | `Formattable<PartNameParams>`             | the raw field value                   | how the name of a node reads everywhere: legend, tooltip, header, label |
| `label.enabled`     | `boolean`                                 | `true`                                | show value labels   |
| `label.placement`   | `center`, edges and corners (9 positions) | `'center'`                            | label position      |
| `label.layout`      | `'stacked' \| 'inline'`                   | `'stacked'`                           | the value on its own line or behind a separator |
| `label.separator`   | `string`                                  | `' · '`                               | between the halves of an inline label |
| `label.minShare`    | `Fraction`                                | `0`                                   | share of the total a node needs to be labelled |
| `label.category`    | `Switchable & FontOptions & Formattable`  | on                                    | the name half: its own font and format |
| `label.value`       | `PartValueLabelOptions`                   | off                                   | the value half: `type: 'percent' \| 'value'`, `format`, `formatter`, its own font |
| `label.formatter`   | `({ datum, label, value, share }) => string` | —                                  | the whole label at once; wins over `category`/`value` |
| `label.fontSize`    | `Pixels`                                  | `11`                                  | label font size     |
| `label.fontWeight`  | `string \| number`                        | `normal`                              | font weight         |
| `label.fontFamily`  | `string`                                  | theme font                            | font family         |
| `label.color`       | `ColorValue`                              | foreground; auto-contrast when inside | text color          |


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
