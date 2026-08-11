# Bar

Bar series. Categories come from `xField`; values grow from zero.

::: chart-example bar-basic

## Value labels

`label.placement`: outer positions `top`/`bottom`/`left`/`right` and corners
(`top-left`, …), `center`, and inner positions `inner-top`, `inner-top-left`, etc. —
inside a bar the color is chosen by auto-contrast with a halo in the bar's color:

::: chart-example bar-labels

## Styling

`cornerRadius`, a custom fill with opacity, and a stroke:

::: chart-example bar-styled

## Grouping

Multiple bar series automatically share the category band. Adjacent bars are
separated by `groupGap` — a fraction of the slot step (default `0.2`, `0` makes
the bars touch):

::: chart-example bar-grouped

## Stacking

`stacked: true` stacks series on top of each other; `stackGroup` lets you maintain several independent stacks. Negative values accumulate downward from zero.

::: chart-example bar-stacked

### Grouped stacks

`stackGroup` collects series into independent stacks: the groups stand side by side within
a category (series with `stacked: true` but no `stackGroup` go into a shared stack):

::: chart-example bar-grouped-stacks

### Normalized stack (100%)

`normalizedTo` scales the total of each category to the given value:

::: chart-example bar-normalized

## Grouped categories

For hierarchical categories (year → quarter), use the
[`grouped-category`](/guide/axes#hierarchical-categories) axis:

::: chart-example axis-grouped

## Dates instead of categories

With a [`time` axis](/guide/axes#bars-on-a-time-axis) the bars stand at the real
distance between their dates, so a period with no data keeps its place instead
of closing up. The width comes from the step of the data, and `bandSpan` on the
axis overrides it:

::: chart-example bar-time

## Horizontal bars

`direction: 'horizontal'` flips the chart: categories move to the vertical axis.

::: chart-example bar-horizontal

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option             | Type                                    | Default                               | Description                                               |
| ------------------ | --------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| `xField`           | `string`                                | —                                     | data keys (required)                                      |
| `yField`           | `string`                                | —                                     | data keys (required)                                      |
| `name`             | `string`                                | `yField`                              | name for the legend and tooltip                           |
| `direction`        | `'vertical' \| 'horizontal'`            | `'vertical'`                          | bar direction                                             |
| `stacked`          | `boolean`                               | `false`                               | stacking                                                  |
| `normalizedTo`     | `number`                                | —                                     | normalize the stack total (100 — percentage stack)        |
| `stackGroup`       | `string`                                | `'default'`                           | independent stack groups                                  |
| `fill`             | `ColorValue`                            | theme palette                         | fill                                                      |
| `fillOpacity`      | `Fraction`                              | `1`                                   | fill opacity                                              |
| `stroke`           | `ColorValue`                            | —                                     | stroke                                                    |
| `strokeWidth`      | `Pixels`                                | —                                     | stroke                                                    |
| `cornerRadius`     | `Pixels`                                | `0`                                   | corner rounding                                           |
| `groupGap`         | `Fraction`                              | `0.2`                                 | gap between bars of one group (fraction of the slot step) |
| `label.enabled`    | `boolean`                               | `false`                               | show value labels                                         |
| `label.placement`  | outer/`center`/`inner-*` (17 positions) | `'top'`                               | label position                                            |
| `label.formatter`  | `({ value, datum }) => string`          | the value                             | label content                                             |
| `label.fontSize`   | `Pixels`                                | `11`                                  | label font size                                           |
| `label.fontWeight` | `string \| number`                      | `normal`                              | font weight                                               |
| `label.fontFamily` | `string`                                | theme font                            | font family                                               |
| `label.color`      | `ColorValue`                            | foreground; auto-contrast when inside | text color                                                |
