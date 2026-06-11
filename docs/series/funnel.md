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

## Pyramid

Layer height is proportional to the value; `reverse` flips the apex downward.

::: chart-example pyramid-basic

### Spacing and inside labels

`itemSpacing` slices the pyramid into layers; `label.placement: 'inside'` — labels
in the segments with an auto-contrast color:

::: chart-example pyramid-spacing

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option                    | Series                                | Default                                       | Description                                              |
| ------------------------- | ------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `stageField`              | all                                   | —                                             | stage name and value                                     |
| `valueField`              | all                                   | —                                             | stage name and value                                     |
| `fills`                   | all                                   | palette                                       | stage colors                                             |
| `itemSpacing`             | all                                   | funnel `4`, pyramid `0`                       | gap between segments                                     |
| `widthRatio`              | all                                   | `0.62`                                        | fraction of the area width given to the shape (independent of labels) |
| `reverse`                 | pyramid                               | `false`                                       | apex at the bottom                                       |
| `label.enabled`           | `boolean`                             | `true`                                        | stage labels                                             |
| `label.placement`         | `'inside' \| 'outside'`               | funnel `'inside'`; pyramid `'outside'`        | position (shared by all segments)                        |
| `label.formatter`         | `({ datum, stage, value }) => string` | `stage · value`                               | content                                                  |
| `label.fontSize`          | `Pixels`                           | `12`                                          | font                                                     |
| `label.fontWeight`        | `string \| number`                    | `normal`                                      | font weight                                              |
| `label.color`             | `ColorValue`                            | inside — auto-contrast; outside — foreground  | color                                                    |
| `calloutLine.enabled`     | `boolean`                             | `true` when outside                           | line to the outside label                                |
| `calloutLine.length`      | `Pixels`                           | `14`                                          | line length                                              |
| `calloutLine.stroke`      | `ColorValue`                            | segment color                                 | line color                                               |
| `calloutLine.strokeWidth` | `Pixels`                           | `1`                                           | line width                                               |
