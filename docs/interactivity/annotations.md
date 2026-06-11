# Annotations

Declarative marks in data coordinates — drawn on top of the series and
surviving zoom/resize. Interactive drawing is planned for future phases.

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), annotations are a separate module: `register(annotationsModule)`.
:::

::: chart-example annotations-basic

Horizontal and vertical lines can be dragged with the mouse (always enabled).

## Types

| Type              | Fields                                                 | Description                       |
| ----------------- | ------------------------------------------------------ | --------------------------------- |
| `horizontal-line` | `value`, `stroke?`, `lineDash?`, `label?`              | horizontal level                  |
| `vertical-line`   | `value` (category/date), …                             | vertical mark                     |
| `line`            | `start: {x, y}`, `end: {x, y}`                         | arbitrary segment (trend line)    |
| `text`            | `x`, `y`, `text`, `color?`, `fontSize?`                | label at a data point             |
| `range`           | `axis: 'x' \| 'y'`, `range: [a, b]`, `fill?`, `label?` | filled range                      |

### Full list of options

| Option           | Type        | Default      | Description                              |
| ---------------- | ----------- | ------------ | ---------------------------------------- |
| `strokeWidth`    | lines       | `1`          | annotation line width                    |
| `fillOpacity`    | `range`     | `0.12`       | range fill opacity                       |
| `label.text`     | `string`    | —            | line label (horizontal/vertical-line)    |
| `label.fontSize` | `Pixels` | `11`         | label font size                          |
| `label.color`    | `ColorValue`  | line color   | label color                              |

Coordinates are specified as data values: categories/dates for X, numbers for Y.

`horizontal-line` and `vertical-line` can be dragged with the mouse — the value updates
along the scale (categorical lines snap to the nearest category).
