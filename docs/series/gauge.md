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

## Vertical gauge with segments

`orientation: 'vertical'` stands the scale on end. With `segments` the track
carries the qualitative ranges and the value rides over them as a thinner bar,
the way a bullet chart reads; `label.formatter` and `ticks.formatter` say what
the numbers read as:

```ts
{
  type: 'linear-gauge',
  orientation: 'vertical',
  value: 15_400_000,
  target: 18_000_000,
  scale: { min: 0, max: 24_000_000 },
  segments: [
    { to: 8_000_000, color: '#e5484d' },
    { to: 16_000_000, color: '#f4a236' },
    { to: 24_000_000, color: '#21a06c' },
  ],
  label: { formatter: (value) => `${(value / 1e6).toFixed(1)} mln m³` },
  ticks: { formatter: (value) => `${value / 1e6} mln` },
}
```

::: chart-example gauge-vertical

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

| Option   | Type         | Description     |
| -------- | ------------ | --------------- |
| `value`  | `number`     | current value   |
| `needle` | `Switchable` | needle (radial) |
| `target` | `number`     | target mark     |

### Full option list

Both gauges take `segments` and `target`; `orientation` belongs to the linear
one, the angles and the needle to the radial one. A gauge sizes its own text
and its own thickness against the room it was given — every option below only
comes in when the default is not what the tile calls for.

| Option             | Type                         | Default                        | Description                         |
| ------------------ | ---------------------------- | ------------------------------ | ----------------------------------- |
| `startAngle`       | `Degrees`                    | `-110`                         | radial-gauge arc                    |
| `endAngle`         | `Degrees`                    | `110`                          | radial-gauge arc                    |
| `orientation`      | `'horizontal' \| 'vertical'` | `'horizontal'`                 | which way a linear-gauge scale runs |
| `fills`            | `ColorValue[]`               | palette                        | colors (when `segments` is not set) |
| `thickness`        | `Pixels`                     | a share of the room, `14`…`36` | bar/arc thickness                   |
| `scale.min`        | `number`                     | `0`                            | scale minimum                       |
| `scale.max`        | `number`                     | `100`                          | scale maximum                       |
| `target`           | `number`                     | —                              | target mark across the bar/ring     |
| `targetColor`      | `ColorValue`                 | theme foreground               | color of the target mark            |
| `segments[]`       | `{ to, color }[]`            | —                              | color zones of the scale            |
| `label.enabled`    | `boolean`                    | `true`                         | value in the center/alongside       |
| `label.formatter`  | `(value) => string`          | the value                      | value format                        |
| `label.fontSize`   | `Pixels`                     | follows the gauge              | value size                          |
| `label.fontWeight` | `FontWeight`                 | `'bold'`                       | value weight                        |
| `label.fontFamily` | `string`                     | theme font                     | value face                          |
| `label.color`      | `ColorValue`                 | theme foreground               | value color                         |
| `ticks.enabled`    | `boolean`                    | `true`                         | labels of the two ends of the scale |
| `ticks.formatter`  | `(value) => string`          | the bound                      | format of the bounds                |
| `ticks.fontSize`   | `Pixels`                     | theme label size               | size of the bounds                  |
| `ticks.fontWeight` | `FontWeight`                 | `'normal'`                     | weight of the bounds                |
| `ticks.fontFamily` | `string`                     | theme font                     | face of the bounds                  |
| `ticks.color`      | `ColorValue`                 | theme muted                    | color of the bounds                 |

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

`tooltip.renderer` receives `NodeTooltipRendererParams` — `{ label, value, share, color }`,
where `value` is the number the gauge shows.
