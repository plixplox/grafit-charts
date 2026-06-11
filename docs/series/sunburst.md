# Sunburst

Rings per nesting level, with the angle proportional to the value. Data is nested
via `children`; a node's value is the leaf's `sizeField` or the sum of its descendants.

::: chart-example sunburst-basic

## Spacing and corner rounding

`sectorSpacing` is a constant-width gap between sectors (like in pie),
`cornerRadius` rounds the corners:

::: chart-example sunburst-spacing

## Sector labels

`label: { enabled: true }` renders labels in the sectors they fit into;
the color is auto contrast, and `formatter` receives `label`, `value`, and `depth`:

::: chart-example sunburst-labels

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option             | Type                                  | Default                              | Description                              |
| ------------------ | ------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `labelField`       | `string`                              | `label`/`size`/`children`            | hierarchy keys                           |
| `sizeField`        | `string`                              | `label`/`size`/`children`            | hierarchy keys                           |
| `childrenField`    | `string`                              | `label`/`size`/`children`            | hierarchy keys                           |
| `fills`            | `ColorValue[]`                        | palette                              | branch colors                            |
| `sectorSpacing`    | `Pixels`                              | `0`                                  | constant-width gap between sectors       |
| `cornerRadius`     | `Pixels`                              | `0`                                  | sector corner rounding                   |
| `stroke`           | styles                                | background `1px` with zero gap       | sector stroke                            |
| `strokeWidth`      | styles                                | background `1px` with zero gap       | sector stroke                            |
| `label.enabled`    | `boolean`                             | `false`                              | sector labels (when they fit)            |
| `label.formatter`  | `({ label, value, depth }) => string` | node name                            | content                                  |
| `label.fontSize`   | `Pixels`                              | `11`                                 | label font size                          |
| `label.fontWeight` | `string \| number`                    | `normal`                             | font weight                              |
| `label.fontFamily` | `string`                              | theme font                           | font family                              |
| `label.color`      | `ColorValue`                          | auto contrast                        | color (halo in the sector color)         |
