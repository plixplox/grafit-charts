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
| `position`              | `'bottom' \| 'top' \| 'left' \| 'right'` | `'bottom'`   | legend placement             |
| `toggleSeries`          | `boolean`                                | `true`       | click toggles visibility     |
| `item.marker.size`      | `Pixels`                              | `10`         | item marker size             |
| `item.label.fontSize`   | `Pixels`                              | `12`         | label font size              |
| `item.label.fontFamily` | `string`                                 | theme font   | font family                  |
| `item.label.color`      | `ColorValue`                               | foreground   | label color                  |

The item name is the series `name` (or `yField` if no name is set). `showInLegend: false` on a series removes its item.

Items that don't fit are paginated: arrows `‹ 1/3 ›` appear at the bottom of the legend (a horizontal legend fits up to two rows per page). For pie/donut, clicking an item hides the sector.
