# Legend

Enabled by default, at the bottom. Clicking an item hides/shows the series (`toggleSeries`).

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), the legend is a separate module: `register(legendModule)`.
:::

::: chart-example legend-position

## Options

| Option                  | Type                                     | Default      | Description                  |
| ----------------------- | ---------------------------------------- | ------------ | ---------------------------- |
| `enabled`               | `boolean`                                | `true`       | show the legend              |
| `position`              | `LegendPlacement`                        | `'bottom'`   | docking side + alignment, or a floating anchor ([below](#floating-placement)) |
| `floating`              | `boolean`                                | `false`      | overlay the whole chart area instead of reserving space |
| `offset`                | `{ x?: Pixels; y?: Pixels }`             | `0`          | floating only: inset from the anchored edges |
| `toggleSeries`          | `boolean`                                | `true`       | click toggles visibility     |
| `item.marker.size`      | `Pixels`                              | `10`         | item marker size             |
| `item.label.fontSize`   | `Pixels`                              | `12`         | label font size              |
| `item.label.fontFamily` | `string`                                 | theme font   | font family                  |
| `item.label.color`      | `ColorValue`                               | foreground   | label color                  |
| `background.fill`       | `ColorValue`                             | —            | panel fill behind the items  |
| `background.stroke`     | `ColorValue`                             | —            | panel border color           |
| `background.strokeWidth`| `Pixels`                                 | `1`          | panel border width           |
| `background.cornerRadius`| `Pixels`                                | `4`          | panel corner radius          |
| `background.padding`    | `Pixels \| Padding`                      | `8` / `0`    | inner padding; `8` when fill/stroke is set |
| `data`                  | `LegendItemOptions[]`                    | —            | custom items ([below](#custom-items)) |

The item name is the series `name` (or `yField` if no name is set). `showInLegend: false` on a series removes its item.

Items that don't fit are paginated: arrows `‹ 1/3 ›` appear at the bottom of the legend (a horizontal legend fits up to two rows per page). For pie/donut, clicking an item hides the sector.

## Floating placement

`position` is the docking side plus an optional alignment along it: `top-right` docks the legend to the top edge aligned right (`top` centers). `top-*`/`bottom-*` lay items out in horizontal rows, `left-*`/`right-*` — in a vertical column; the first token sets the orientation.

With `floating: true` the legend stops reserving space and overlays the chart (CSS `position: absolute` style). It is anchored to the **whole chart area** — captions included — so a left-aligned title and a `top-right` floating legend sit on the same level:

::: chart-example legend-floating

`offset` insets the box from the anchored edges (`x` from left/right, `y` from top/bottom); along a centered axis a positive value shifts right/down. `background` draws a panel behind the items — handy over the plot.

## Custom items

`legend.data` fully replaces the auto-derived series items. Useful when colors carry meaning inside a single series — e.g. a Gantt-style range-bar painted by a per-datum `fill` callback:

::: chart-example legend-custom-data

| Option         | Type                                    | Description                                             |
| -------------- | --------------------------------------- | ------------------------------------------------------- |
| `name`         | `string`                                 | display text (required)                                  |
| `series`       | `string`                                 | binds the item to a series for toggling                  |
| `marker.color` | `ColorValue`                             | marker color; a bound item inherits the series color     |
| `marker.size`  | `Pixels`                                 | per-item marker size                                     |
| `label`        | `FontOptions`                            | per-item label font/color                                |
| `value`        | `string`                                 | value to the right of the label                          |

`series` is matched against the series `id` first, then its `name`. A bound item toggles the series on click and dims when it is hidden; an item without `series` (or with an unknown reference) is static — it renders, but clicking does nothing. For pie/donut, bind to an individual sector by its label (or an explicit `id#index`); binding to the pie series as a whole is not supported.
