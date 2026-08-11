# Funnel and Pyramid

Stage-based series without axes: flat data with `stageField`/`valueField`.

## Funnel

Stages run top to bottom, width is proportional to the value. `funnel` — rectangular
stages, `cone-funnel` — trapezoids tapering to the next stage.

::: chart-example funnel-basic

### Spacing and outside labels

`itemSpacing` — the gap between segments; `label.placement: 'outside'` moves
labels out to the right. The shape geometry does not depend on labels — the width is set by `widthRatio`:

::: chart-example funnel-spacing

### Cone funnel with outside labels

Trapezoidal stages; the callout line starts at the slanted edge. Inside labels
get an outline in the background color (readable on any segment):

::: chart-example cone-funnel-labels

### What the label is made of

A stage label is the name of the stage and its value, drawn as one block so the
two always read together — the same label a pie sector gets. Each half carries
its own font, `layout` decides whether the value follows the name (`'inline'`,
the default, behind `separator`) or sits on a line of its own (`'stacked'`), and
`value.type: 'percent'` turns the number into the share of the whole funnel:

```js
label: {
  placement: 'outside',
  layout: 'stacked',
  category: { fontWeight: 'bold' },
  value: { type: 'percent', fontSize: 11, color: '#8a8f98' },
},
```

::: chart-example funnel-label-parts

The stage name comes out of a data field, and that field has a format like any
other — a date with its granularity, a code with its wording. `stageName` says
how that value becomes text, once for the whole series: the legend, the tooltip
heading and the name half of the label all read the same. Both halves of the
contract are accepted — `format`, a serializable string that survives a saved
config, and `formatter`, for what a string cannot express:

```js
stageName: { formatter: ({ datum, value }) => formatWeek(value) },
```

Where a label wants something shorter than the legend, `label.category` has a
format of its own and overrides `stageName` — that is what it is for. It answers
for the name exactly as `value.format`/`value.formatter` answer for the number,
and its formatter receives the same `{ datum, stage, value, share }`:

```js
label: { category: { format: '%d.%m.%Y' }, value: { type: 'percent' } },
```

Either half can go on its own — `category: { enabled: false }` leaves the bare
number, `value: { enabled: false }` the bare name. `label.formatter` still
speaks for the whole label when one text is all you want; it wins over
`category`/`value`.

### A long tail of thin stages

Every stage is labelled whatever its size, and the crowded ones simply overlap.
The same two options a pie has thin them out, and they answer different questions.

`label.minShare` decides which stages are worth a label at all: below that share
of the total a stage is drawn but left unlabelled — what the funnel narrows down
to keeps its callout, the tail stays in the shape and in the tooltip.

::: chart-example funnel-significant

`label.avoidOverlap` decides whether there is room for a label: the largest
stages ask first, so a funnel squeezed for height loses the labels of its
thinnest stages rather than of its last ones.

The two combine: `minShare` picks the stages worth labelling, `avoidOverlap`
guarantees that what is left never collides.

### The tooltip

The default tooltip reads the stage value with its share of the whole funnel.
The series `tooltip.renderer` receives the whole `datum`, so it can display any
fields:

```js
tooltip: {
  renderer: ({ datum, stage, value, color }) => ({
    heading: stage,
    rows: [{ label: 'Users', value: `${value} of ${datum.target}`, color }],
  }),
}
```

## Pyramid

Layer height is proportional to the value; `reverse` flips the apex downward.

::: chart-example pyramid-basic

### Spacing and inside labels

`itemSpacing` slices the pyramid into layers; `label.placement: 'inside'` — labels
in the segments with an auto-contrast color:

::: chart-example pyramid-spacing

### What the label is made of

A pyramid layer gets the same block label as a funnel stage: the name and the
value, each with its own font, `layout: 'stacked'` putting the value on its own
line and `value: { type: 'percent' }` reading it as the share of the total.

```js
label: { placement: 'inside', layout: 'stacked', value: { type: 'percent' } },
```

### Labels toward the apex

The layers thin out toward the apex, and their labels are the first to run out
of room. `label.minShare` leaves the thinnest layers unlabelled;
`label.avoidOverlap` hands out what is left to the thickest layers first:

::: chart-example pyramid-crowded

## Selection

Stages and layers are picked out by clicks, the way pie sectors are: a selected
segment is outlined and the rest fade back while the selection is active.
`listeners.nodeClick` and `listeners.selectionChange` fire as they do elsewhere,
and the selection is drivable from code (`chart.setSelection`, `chart.clickNode`) —
see [Selection](/interactivity/selection).

```js
selection: { enabled: true, mode: 'multiple' },
listeners: { selectionChange: ({ items }) => console.log(items) },
```

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                     | Series                                  | Default                                      | Description                                                           |
| -------------------------- | --------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `stageField`               | all                                     | —                                            | stage name and value                                                  |
| `stageName.format`         | `string`                                | —                                            | how the stage-name field becomes text: legend, tooltip heading, label |
| `stageName.formatter`      | `({ datum, value }) => string`          | —                                            | the same, when a format string cannot express it                      |
| `valueField`               | all                                     | —                                            | stage name and value                                                  |
| `fills`                    | all                                     | palette                                      | stage colors                                                          |
| `itemSpacing`              | all                                     | funnel `4`, pyramid `0`                      | gap between segments                                                  |
| `widthRatio`               | all                                     | `0.62`                                       | fraction of the area width given to the shape (independent of labels) |
| `reverse`                  | pyramid                                 | `false`                                      | apex at the bottom                                                    |
| `label.enabled`            | `boolean`                               | `true`                                       | stage labels                                                          |
| `label.placement`          | `'inside' \| 'outside'`                 | funnel `'inside'`; pyramid `'outside'`       | position (shared by all segments)                                     |
| `label.formatter`          | `({ datum, stage, value }) => string`   | —                                            | the whole label at once; wins over category/value                     |
| `label.layout`             | `'inline' \| 'stacked'`                 | `'inline'`                                   | the value behind a separator or on its own line                       |
| `label.separator`          | `string`                                | `' · '`                                      | what separates the halves of an inline label                          |
| `label.category.enabled`   | `boolean`                               | `true`                                       | the stage name as part of the label                                   |
| `label.category.format`    | `string`                                | —                                            | format string for the name field (`'%d.%m.%Y'`, `',.0f'`)             |
| `label.category.formatter` | `({ datum, stage, value, share }) => …` | —                                            | text of the name half                                                 |
| `label.category.format`    | `string`                                | —                                            | format string for the name field (`'%d.%m.%Y'`, `',.0f'`)             |
| `label.category.formatter` | `({ datum, stage, value, share }) => …` | —                                            | text of the name half                                                 |
| `label.category.*`         | `FontOptions`                           | the label font                               | font of the name                                                      |
| `label.value.enabled`      | `boolean`                               | `true`                                       | the value as part of the label                                        |
| `label.value.type`         | `'value' \| 'percent'`                  | `'value'`                                    | the value itself or its share of the total                            |
| `label.value.format`       | `string`                                | —                                            | format string (`',.0f'`, `'.1%'`)                                     |
| `label.value.formatter`    | `({ datum, stage, value, share }) => …` | —                                            | text of the value half                                                |
| `label.value.*`            | `FontOptions`                           | the label font                               | font of the value                                                     |
| `label.fontSize`           | `Pixels`                                | `12`                                         | font                                                                  |
| `label.fontWeight`         | `string \| number`                      | `normal`                                     | font weight                                                           |
| `label.color`              | `ColorValue`                            | inside — auto-contrast; outside — foreground | color                                                                 |
| `label.minShare`           | `Fraction`                              | `0`                                          | share of the total a stage needs before it is worth a label           |
| `label.avoidOverlap`       | `boolean`                               | `false`                                      | drop the labels there is no room for instead of letting them overlap  |
| `calloutLine.enabled`      | `boolean`                               | `true` when outside                          | line to the outside label                                             |
| `calloutLine.length`       | `Pixels`                                | `14`                                         | line length                                                           |
| `calloutLine.stroke`       | `ColorValue`                            | segment color                                | line color                                                            |
| `calloutLine.strokeWidth`  | `Pixels`                                | `1`                                          | line width                                                            |
| `tooltip.renderer`         | `({ datum, stage, value, color }) => …` | —                                            | custom tooltip                                                        |
