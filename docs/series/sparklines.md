# Sparklines

Miniature charts without axes and chrome — for tables and cards:

Line:

::: chart-example sparkline-line

Area:

::: chart-example sparkline-area

Bar:

::: chart-example sparkline-bar

## Preset

```ts
Charts.createSparkline({
  container,
  data, // [{ value: 12 }, ...]
  field: 'value',
  type: 'area', // 'line' | 'area' | 'bar'
  height: 40,
});
```

The preset builds regular options: a series + "bare" axes + minimal padding —
the same thing can be assembled manually (see the config.ts tab above).

## Options

| Option      | Type                        | Default        | Description                                               |
| ----------- | --------------------------- | -------------- | --------------------------------------------------------- |
| `type`      | `'line' \| 'area' \| 'bar'` | `'line'`       | sparkline kind                                            |
| `container` | data                        | —              | container, data, and value field (categories are indices) |
| `data`      | data                        | —              | container, data, and value field (categories are indices) |
| `field`     | data                        | —              | container, data, and value field (categories are indices) |
| `fill`      | `ColorValue`                | palette        | colors                                                    |
| `stroke`    | `ColorValue`                | palette        | colors                                                    |
| `width`     | `Pixels`                    | from container | dimensions                                                |
| `height`    | `Pixels`                    | from container | dimensions                                                |
| `theme`     | `ThemeName \| ThemeOptions` | `default`      | theme                                                     |
