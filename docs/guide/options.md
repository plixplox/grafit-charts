# Configuration

A chart is fully described by a single `ChartOptions` object — it is
serializable, type-safe, and works identically in `Charts.create` and
`chart.update`.

A minimal working example:

```ts
import { Charts } from 'grafit-charts';

const chart = Charts.create({
  container: document.getElementById('app')!, // where to render
  data: [
    { month: 'Jan', plan: 120, fact: 134 },
    { month: 'Feb', plan: 125, fact: 118 },
  ],
  series: [
    { type: 'bar', xField: 'month', yField: 'plan', name: 'Plan' },
    { type: 'line', xField: 'month', yField: 'fact', name: 'Actual' },
  ],
});
```

That is all you need: axes, legend, tooltips, highlighting and the entry
animation are enabled by default.

## Data and series

`data` is an array of flat objects. Series contain no data of their own — they
reference fields via `xField`/`yField` (specialized series have their own
fields: `angleField`, `sizeField`, `openField`…).

`series` is a **discriminated union** on the `type` field: after
`type: 'bar'`, TypeScript suggests only bar options and won't let you pass
options that belong to other series. All 27 series types are listed in the
“Series” section; their shared options are on the
[Common series options](/guide/series-options) page.

## Axes

If `axes` are not specified, the widget creates them itself: `category` at the
bottom + `number` on the left (the other way around for horizontal bars;
scatter/histogram request a numeric X axis; heatmap gets categorical axes with
no lines or grid). An explicit `axes` block is needed when you want a different
axis type, label formatting, crossLines, etc. — see [Axes](/guide/axes).

```ts
axes: [
  { type: 'time', position: 'bottom', label: { format: '%d %b' } },
  { type: 'number', position: 'left', nice: true },
],
```

## Size

Without `width`/`height` the chart tracks its container via `ResizeObserver` —
size the container with CSS. Numeric `width`/`height` fix the size.

## Titles, padding, background

| Option               | Type        | Default      | Description                  |
| -------------------- | ----------- | ------------ | ---------------------------- |
| `title.text`         | `string`    | —            | chart title                  |
| `title.fontSize`     | `Pixels` | `17`         | title font size              |
| `title.color`        | `ColorValue`  | foreground   | color                        |
| `subtitle.text`      | `string`    | —            | subtitle (muted)             |
| `padding.top`        | `Pixels` | `12`         | outer chart padding          |
| `padding.right`      | `Pixels` | `20`         | —                            |
| `padding.bottom`     | `Pixels` | `12`         | —                            |
| `padding.left`       | `Pixels` | `20`         | —                            |
| `background.fill`    | `ColorValue`  | theme background | backdrop fill            |
| `background.visible` | `boolean`   | `true`       | whether to draw the background |

## Overlays and loading

| Option                  | Type      | Default      | Description                          |
| ----------------------- | --------- | ------------ | ------------------------------------ |
| `loading`               | `boolean` | `false`      | show the “Loading data…” overlay     |
| `overlays.loading.text` | `string`  | from `locale` | loading overlay text                |
| `overlays.noData.text`  | `string`  | from `locale` | text shown when `data` is empty     |

## Conventions

- **`*Field` / `*Name`** — “data key / display name” pairs: `*Field` points to
  a field in `data`, `*Name` is shown in the legend and the tooltip.
- **`{ enabled }`** — every optional block (`legend`, `tooltip`,
  `axis.label`, `series.marker`, …) is toggled with this flag; a block without
  `enabled: false` is enabled.
- **`format` / `formatter`** — value formatting as a string (`',.2f'`,
  `'.0%'`, `'%d %b'`) or as a function; functions are isolated leaves — the
  rest of the object is JSON-serializable.
- Mutations of the object you passed in are not tracked — update the chart via
  its methods.

## Updating and instance methods

```ts
await chart.updateDelta({ theme: 'dark' }); // targeted change
await chart.update(buildOptions(newData)); // full replacement
```

| Method                           | Description                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| `update(options)`                | full options replacement; the Promise resolves after rendering    |
| `updateDelta(patch)`             | deep merge: objects are merged, arrays are replaced as a whole    |
| `getOptions()`                   | current options                                                   |
| `getState()` / `setState(state)` | zoom and hidden series — see [State](/interactivity/state)        |
| `waitForUpdate()`                | wait for a scheduled render                                       |
| `getImageDataURL(opts?)`         | PNG/JPEG as a data URL                                            |
| `download(opts?)`                | download an image (`{ fileName?, fileFormat? }`)                  |
| `destroy()`                      | release the DOM and subscriptions                                 |

## All root-level blocks

| Block                                 | What it does                          | Read more                                    |
| ------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `container`, `data`, `series`, `axes` | chart foundation                      | above on this page                           |
| `width`, `height`                     | fixed size                            | [Size](#size)                                |
| `title`, `subtitle`                   | titles                                | [Titles](#titles-padding-background)         |
| `padding`, `background`               | padding and background                | [Titles](#titles-padding-background)         |
| `loading`, `overlays`                 | overlays                              | [Overlays](#overlays-and-loading)            |
| `theme`                               | theme name or object                  | [Themes](/guide/themes)                      |
| `legend`                              | legend                                | [Legend](/interactivity/legend)              |
| `gradientLegend`                      | color scale for colorField series     | [Heatmap](/series/heatmap)                   |
| `tooltip`                             | tooltips (modes, position, snapping)  | [Tooltip](/interactivity/tooltip)            |
| `highlight`                           | hover highlighting and dimming        | [Tooltip](/interactivity/tooltip)            |
| `crosshair`                           | crosshair                             | [Crosshair](/interactivity/crosshair)        |
| `zoom`, `navigator`                   | zoom and range bar                    | [Zoom](/interactivity/zoom)                  |
| `sync`                                | synchronizing multiple charts         | [State](/interactivity/state)                |
| `selection`                           | data selection                        | [Data selection](/interactivity/selection)   |
| `listeners`                           | chart events                          | [Events](/interactivity/listeners)           |
| `annotations`                         | lines/ranges/text on the chart        | [Annotations](/interactivity/annotations)    |
| `animation`                           | entry and updates                     | [State](/interactivity/state)                |
| `initialState`                        | initial zoom/hidden series            | [State](/interactivity/state)                |
| `contextMenu`                         | right-click menu                      | [State](/interactivity/state)                |
| `locale`                              | UI strings                            | [Accessibility](/guide/accessibility)        |
