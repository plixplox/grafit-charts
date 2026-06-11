# Crosshair

A crosshair with value labels on the axes. By default it snaps to the nearest node
(`snap`), together with the tooltip and highlighting.

::: tip Modular build
When building with [grafit-charts/core](/guide/bundle), the crosshair is a separate module: `register(crosshairModule)`.
:::

::: chart-example crosshair-basic

| Option          | Type          | Default      | Description                                  |
| --------------- | ------------- | ------------ | -------------------------------------------- |
| `enabled`       | `boolean`     | —            | enable (presence of the block → enabled)     |
| `snap`          | `boolean`     | `true`       | snap to the nearest node                     |
| `stroke`        | `ColorValue`    | theme muted  | line color                                   |
| `strokeWidth`   | `Pixels`   | `1`          | line width                                   |
| `lineDash`      | `Pixels[]` | `[4, 3]`     | dash pattern                                 |
| `label.enabled` | `boolean`     | `true`       | value labels on the axes                     |
