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

A second value axis on the opposite side gets its own scale; `keys` on each axis
says which series it carries — see [Two value axes](/guide/axes#two-value-axes).

A polar chart — radar, rose, radial bars — has two axes rather than a list of
them, so it reads `axes` as a pair: `angle` for the categories around the rim and
`radius` for the value rings.

```ts
axes: {
  angle: { title: { text: 'Month' } },
  radius: { min: 0, max: 60, ringCount: 3 },
},
```

See [Polar axes](/guide/axes#polar-axes).

## Size

Without `width`/`height` the chart tracks its container via `ResizeObserver` —
size the container with CSS. Numeric `width`/`height` fix the size.

| Option       | Type      | Default                                         | Description                                                   |
| ------------ | --------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `width`      | `number`  | container width                                 | fixed width, px                                               |
| `height`     | `number`  | container height                                | fixed height, px                                              |
| `minWidth`   | `number`  | `300`                                           | floor under the width measured off the container; `0` — none  |
| `minHeight`  | `number`  | `200`                                           | floor under the height measured off the container; `0` — none |
| `responsive` | `boolean` | `true` unless both `width` and `height` are set | whether to follow the container                               |

A size measured off the container has a floor under it — 300×200 — so a chart in
a container that has not been sized yet does not come out unreadably small. The
floor is a floor and not a limit on the container: a wider container wins over
it, a narrower one does not, and the canvas then sits inside the container at a
size the container does not have.

`minWidth`/`minHeight` move that floor, and `0` takes it away — which is what a
dense layout wants: a dashboard tile 195 px across, a row of KPI cards 140 px
tall, a sparkline in a table cell. The chart fits what it draws to the room it
has; trim the rest through the options it already has — `legend.enabled`,
`title`, `axes[].label`.

```ts
Charts.create({ container, data, series, minWidth: 0, minHeight: 0 });
```

With the floor gone a container can measure nothing at all — `display: none`, a
tab not shown yet. The chart says so once in the console and waits: no layout is
built at 0×0, and the first size the `ResizeObserver` brings is the one it draws
at. A chart hidden after it was drawn keeps the layout it comes back to.

`responsive` splits the two questions `width`/`height` used to answer at once —
what the size is, and who measures it. `responsive: false` measures the
container once and never again. `responsive: true` alongside `width`/`height`
keeps the observer and demotes the numbers to the size to start at, taken only
while the container has no box to measure.

## Titles, padding, background

| Option               | Type                            | Default                                        | Description                                                                                 |
| -------------------- | ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `title.text`         | `string`                        | —                                              | chart title                                                                                 |
| `title.textAlign`    | `'left' \| 'center' \| 'right'` | `'center'`                                     | horizontal alignment                                                                        |
| `title.fontSize`     | `Pixels`                        | `17`                                           | title font size                                                                             |
| `title.color`        | `ColorValue`                    | foreground                                     | color                                                                                       |
| `title.position`     | `'top' \| 'bottom'`             | `'top'`                                        | above or below the plot                                                                     |
| `title.padding`      | `PaddingValue`                  | `8` below the title                            | padding around the title text; by default only the plot-facing side                         |
| `title.wrap`         | `boolean`                       | `true`                                         | break long text onto several lines                                                          |
| `subtitle.text`      | `string`                        | —                                              | subtitle (muted, same options)                                                              |
| `subtitle.padding`   | `PaddingValue`                  | `8` below the subtitle                         | padding around the subtitle text                                                            |
| `padding`            | `PaddingValue`                  | `{ top: 12, right: 20, bottom: 12, left: 20 }` | outer chart padding: `12`, `[12, 20]`, `[12, 20, 12, 20]` or `{ top, right, bottom, left }` |
| `background.fill`    | `ColorValue`                    | theme background                               | backdrop fill                                                                               |
| `background.visible` | `boolean`                       | `true`                                         | whether to draw the background                                                              |

All caption options with live examples: [Title and subtitle](/interactivity/captions).

## Overlays and loading

| Option                  | Type      | Default       | Description                            |
| ----------------------- | --------- | ------------- | -------------------------------------- |
| `loading`               | `boolean` | `false`       | show the “Loading data…” overlay       |
| `overlays.loading.text` | `string`  | from `locale` | loading overlay text                   |
| `overlays.noData.text`  | `string`  | from `locale` | text shown when `data` is empty        |
| `overlays.error.text`   | `string`  | from `locale` | text shown when nothing could be drawn |

A series handed scales its marks cannot be drawn on — bars against a value axis
of categories, a `time` axis whose values are no dates — is left out rather than
taken as an error: the chart draws everything else, states the reason once in
the console, and shows the `error` overlay only when nothing was drawn at all.
A render is called from the animation tick and from a `ResizeObserver`, where a
throw would be an unhandled error every frame, so it never throws.

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

| Method                                                      | Description                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `update(options)`                                           | full options replacement; the Promise resolves after rendering                        |
| `updateDelta(patch)`                                        | deep merge: objects are merged, arrays are replaced as a whole                        |
| `getOptions()`                                              | current options                                                                       |
| `getState()` / `setState(state)`                            | zoom and hidden series — see [State](/interactivity/state)                            |
| `waitForUpdate()`                                           | wait for a scheduled render (and for pending web fonts)                               |
| `showTooltip` / `clickNode` / `setSelection` / `zoomTo` / … | drive the interactions from code — see [Programmatic control](/interactivity/control) |
| `getImageDataURL(opts?)`                                    | PNG/JPEG as a data URL                                                                |
| `download(opts?)`                                           | download an image (`{ fileName?, fileFormat? }`)                                      |
| `destroy()`                                                 | release the DOM and subscriptions                                                     |

## All root-level blocks

| Block                                 | What it does                         | Read more                                  |
| ------------------------------------- | ------------------------------------ | ------------------------------------------ |
| `container`, `data`, `series`, `axes` | chart foundation                     | above on this page                         |
| `width`, `height`                     | fixed size                           | [Size](#size)                              |
| `title`, `subtitle`                   | titles                               | [Titles](#titles-padding-background)       |
| `padding`, `background`               | padding and background               | [Titles](#titles-padding-background)       |
| `loading`, `overlays`                 | overlays                             | [Overlays](#overlays-and-loading)          |
| `theme`                               | theme name or object                 | [Themes](/guide/themes)                    |
| `fonts`                               | redraw once a web font has loaded    | [Themes](/guide/themes#web-fonts)          |
| `legend`                              | legend                               | [Legend](/interactivity/legend)            |
| `gradientLegend`                      | color scale for colorField series    | [Heatmap](/series/heatmap)                 |
| `tooltip`                             | tooltips (modes, position, snapping) | [Tooltip](/interactivity/tooltip)          |
| `highlight`                           | hover highlighting and dimming       | [Tooltip](/interactivity/tooltip)          |
| `crosshair`                           | crosshair                            | [Crosshair](/interactivity/crosshair)      |
| `zoom`, `navigator`                   | zoom and range bar                   | [Zoom](/interactivity/zoom)                |
| `sync`                                | synchronizing multiple charts        | [State](/interactivity/state)              |
| `selection`                           | data selection                       | [Data selection](/interactivity/selection) |
| `listeners`                           | chart events                         | [Events](/interactivity/listeners)         |
| `annotations`                         | lines/ranges/text on the chart       | [Annotations](/interactivity/annotations)  |
| `animation`                           | entry and updates                    | [State](/interactivity/state)              |
| `initialState`                        | initial zoom/hidden series           | [State](/interactivity/state)              |
| `contextMenu`                         | right-click menu                     | [State](/interactivity/state)              |
| `locale`                              | UI strings                           | [Accessibility](/guide/accessibility)      |
