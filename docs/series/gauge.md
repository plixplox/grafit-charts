# Gauges

Gauges are series without data: the value is set directly in the options.

## Radial gauge

::: chart-example gauge-radial

## Linear gauge

A linear scale with a target mark (bullet):

::: chart-example gauge-linear

## Target on a linear gauge

`target` — the target mark, `thickness` — the bar height:

::: chart-example gauge-target

## Preset

```ts
Charts.createGauge({
  container,
  type: 'radial-gauge', // | 'linear-gauge'
  value: 67,
  scale: { min: 0, max: 100 },
  title: 'Cluster load',
});
```

| Option   | Type         | Description          |
| -------- | ------------ | -------------------- |
| `value`  | `number`     | current value        |
| `needle` | `Switchable` | needle (radial)      |
| `target` | `number`     | target mark (linear) |

### Full option list

| Option            | Type                | Default                             | Description                         |
| ----------------- | ------------------- | ----------------------------------- | ----------------------------------- |
| `startAngle`      | `Degrees`           | `-110`                              | radial-gauge arc                    |
| `endAngle`        | `Degrees`           | `110`                               | radial-gauge arc                    |
| `fills`           | `ColorValue[]`      | palette                             | colors (when `segments` is not set) |
| `thickness`       | `Pixels`            | linear `16`; radial auto (min `10`) | bar/arc thickness                   |
| `scale.min`       | `number`            | `0`                                 | scale minimum                       |
| `scale.max`       | `number`            | `100`                               | scale maximum                       |
| `label.enabled`   | `boolean`           | `true`                              | value in the center/alongside       |
| `label.formatter` | `(value) => string` | the value                           | value format                        |
| `segments[]`      | `{ to, color }[]`   | —                                   | radial-gauge color zones            |

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).
