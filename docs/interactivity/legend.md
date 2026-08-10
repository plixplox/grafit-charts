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
| `avoidCaptions`         | `boolean`                                | `true`       | floating only: title/subtitle flow around the legend box |
| `toggleSeries`          | `boolean`                                | `true`       | click toggles visibility     |
| `maxRows`               | `number`                                 | `2`          | rows per page in a horizontal legend |
| `maxWidth`              | `Length`                                 | the chart    | width the legend never goes past ([below](#size-limits)) |
| `maxHeight`             | `Length`                                 | the chart    | height the legend never goes past ([below](#size-limits)) |
| `reverse`               | `boolean`                                | `false`      | render the items back to front |
| `item.marker`           | `LegendMarkerOptions`                    | —            | marker glyph ([below](#markers)) |
| `item.label.fontSize`   | `Pixels`                              | `12`         | label font size              |
| `item.label.fontFamily` | `string`                                 | theme font   | font family                  |
| `item.label.color`      | `ColorValue`                               | foreground   | label color                  |
| `item.value`            | `FontOptions`                            | label font, muted | font/color of the value text |
| `item.gap`              | `Pixels`                                 | `18`         | gap between items in a row   |
| `item.rowGap`           | `Pixels`                                 | `8`          | gap between rows             |
| `item.markerGap`        | `Pixels`                                 | `6`          | gap between the marker and the label |
| `item.valueGap`         | `Pixels`                                 | `14`         | gap between the label and the value |
| `item.hiddenOpacity`    | `Fraction`                               | `0.4`        | opacity of an item whose series is hidden |
| `background.fill`       | `ColorValue`                             | —            | panel fill behind the items  |
| `background.stroke`     | `ColorValue`                             | —            | panel border color           |
| `background.strokeWidth`| `Pixels`                                 | `1`          | panel border width           |
| `background.cornerRadius`| `Pixels`                                | `4`          | panel corner radius          |
| `background.padding`    | `PaddingValue`                           | `8` / `0`    | inner padding, CSS-like ([below](#panel)); `8` when fill/stroke is set |
| `background.shadow`     | `ShadowOptions`                          | —            | drop shadow under the panel ([below](#panel)) |
| `data`                  | `LegendItemOptions[]`                    | —            | custom items ([below](#custom-items)) |

The item name is the series `name` (or `yField` if no name is set). `showInLegend: false` on a series removes its item.

Items that don't fit are paginated: arrows `‹ 1/3 ›` appear at the bottom of the legend (a horizontal legend fits `maxRows` rows per page, two by default). For pie/donut, clicking an item hides the sector.

## Size limits

A legend takes what its items need, and with long series names a vertical one takes it from the plot. `maxWidth` and `maxHeight` bound it; what they mean follows the orientation the `position` sets:

| Legend                  | `maxWidth`                                              | `maxHeight`                                  |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------- |
| vertical (`left`/`right`) | labels that no longer fit are cut with an ellipsis     | items past it move to the next page          |
| horizontal (`top`/`bottom`) | items wrap onto the next row within it               | caps the rows per page, along with `maxRows`  |

```js
legend: { position: 'right', maxWidth: 160 },
```

Both take pixels or a percentage string — `'40%'` is read against the room the layout offered the legend: the chart minus its padding and the captions, or the whole chart area for a floating legend. A cap that keeps its share of the chart as it resizes is what a responsive chart usually wants:

```js
legend: { position: 'right', maxWidth: '25%' },
```

A malformed value (`'160px'`, `'%'`) is ignored and the legend stays unbounded.

A label is cut to the room its item has whether or not `maxWidth` is set — the chart width is the limit either way, so a name too long for the chart never runs off it.

## Floating placement

`position` is the docking side plus an optional alignment along it: `top-right` docks the legend to the top edge aligned right (`top` centers). `top-*`/`bottom-*` lay items out in horizontal rows, `left-*`/`right-*` — in a vertical column; the first token sets the orientation.

With `floating: true` the legend stops reserving space and overlays the chart (CSS `position: absolute` style). It is anchored to the **whole chart area** — captions included — so a left-aligned title and a `top-right` floating legend sit on the same level:

::: chart-example legend-floating

`offset` insets the box from the anchored edges (`x` from left/right, `y` from top/bottom); along a centered axis a positive value shifts right/down. `background` draws a panel behind the items — handy over the plot.

Since the legend overlays the caption zone, the [title and subtitle flow around it](/interactivity/captions#flowing-around-a-floating-legend) by default: lines level with the legend box wrap inside the gap beside it. `avoidCaptions: false` restores the plain overlay — the captions keep the full chart width and the legend is drawn on top:

```js
legend: { position: 'top-right', floating: true, avoidCaptions: false },
```

## Panel

`background.padding` takes any CSS-like shorthand — a single value, `[vertical, horizontal]`, `[top, right, bottom, left]`, or `{ top, right, bottom, left }` (the same shorthands work for the chart-level `padding`).

`background.shadow` lifts the panel off what it overlays. Any field turns the shadow on; `enabled: false` removes it.

| Option    | Type         | Default              | Description                       |
| --------- | ------------ | -------------------- | --------------------------------- |
| `color`   | `ColorValue` | `rgba(0, 0, 0, 0.2)` | shadow color                      |
| `blur`    | `Pixels`     | `8`                  | blur radius                       |
| `offsetX` | `Pixels`     | `0`                  | horizontal offset                 |
| `offsetY` | `Pixels`     | `2`                  | vertical offset                   |
| `enabled` | `boolean`    | `true`               | `false` removes the shadow        |

The shadow is cast by the panel fill, so it needs `background.fill`; the border is drawn without it.

## Markers

`item.marker` sets the glyph for every item; a `data` item overrides it field by field.

| Option        | Type                | Default    | Description                                          |
| ------------- | ------------------- | ---------- | ---------------------------------------------------- |
| `shape`       | `LegendMarkerShape` | `'square'` | `circle`, `square`, `diamond`, `triangle`, `cross`, `plus`, `line` |
| `path`        | `string`            | —          | custom glyph as SVG path data; wins over `shape`      |
| `viewBox`     | `number`            | `24`       | side of the square the `path` coordinates live in     |
| `size`        | `Pixels`            | `10`       | marker box side (`line` is drawn 1.8× wider)          |
| `stroke`      | `ColorValue`        | —          | outline color; without it the glyph is filled only    |
| `strokeWidth` | `Pixels`            | `1`        | outline width, and the thickness of a `line` marker   |
| `lineDash`    | `Pixels[]`          | —          | dashes for a `line` marker                            |
| `cornerRadius`| `Pixels`            | `3`        | `square` only: corner rounding                        |

`line` draws a dash — the way a line/area series looks on the plot; `path` takes plain SVG path data (`d`), so an icon set drops straight in. The coordinates are read in a `viewBox × viewBox` square and scaled to `size`, so the same `d` fits any marker size:

::: chart-example legend-markers

## Custom items

`legend.data` fully replaces the auto-derived series items. Useful when colors carry meaning inside a single series — e.g. a Gantt-style range-bar painted by a per-datum `fill` callback:

::: chart-example legend-custom-data

| Option         | Type                                    | Description                                             |
| -------------- | --------------------------------------- | ------------------------------------------------------- |
| `name`         | `string`                                 | display text (required)                                  |
| `series`       | `string`                                 | binds the item to a series for toggling                  |
| `marker.color` | `ColorValue`                             | marker color; a bound item inherits the series color     |
| `marker`       | `LegendMarkerOptions`                    | shape/path/size — every [marker option](#markers), on top of `item.marker` |
| `label`        | `FontOptions`                            | per-item label font/color                                |
| `value`        | `string`                                 | value to the right of the label                          |

`series` is matched against the series `id` first, then its `name`. A bound item toggles the series on click and dims when it is hidden; an item without `series` (or with an unknown reference) is static — it renders, but clicking does nothing. For pie/donut, bind to an individual sector by its label (or an explicit `id#index`); binding to the pie series as a whole is not supported.
