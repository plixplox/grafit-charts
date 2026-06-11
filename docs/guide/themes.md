# Themes

A theme defines the series palette, background/text colors and the font.
`theme` accepts a built-in theme name or a `ThemeOptions` object.

## Built-in themes

`'default'` — light (used when `theme` is omitted):

::: chart-example theme-light

`'dark'` — dark:

::: chart-example theme-dark

The theme can be switched on the fly — `chart.updateDelta({ theme: 'dark' })`
re-renders the chart with animation. The demos on this site switch this way
along with the page theme (unless the example sets a theme explicitly).

## Custom theme

A theme object is `baseTheme` (the foundation) + `palette` (series colors,
cycled) + `params` (design tokens):

::: chart-example theme-custom

A color set on a series (`fill`, `stroke`) takes precedence over the theme
palette.

## Overrides

`overrides` are partial options layered beneath user options: `common` —
chart-level blocks for all charts, `<seriesType>.series` — defaults for series
of that type. Handy for extracting your brand style into a single object:

::: chart-example theme-overrides

Precedence: library defaults < `overrides.common` <
`overrides[type].series` < explicit options.

## ThemeOptions

| Option                          | Type                      | Description                            |
| ------------------------------- | ------------------------- | -------------------------------------- |
| `baseTheme`                     | `'default' \| 'dark'`     | base theme to build on                 |
| `palette.fills`                 | `ColorValue[]`              | series fill colors, by series index    |
| `palette.strokes`               | `ColorValue[]`              | stroke colors (defaults to fills)      |
| `params.backgroundColor`        | `ColorValue`                | chart background                       |
| `params.foregroundColor`        | `ColorValue`                | primary text color                     |
| `params.fontFamily`             | `string`                  | font for all text                      |
| `overrides.common`              | `Record<string, unknown>` | chart-level blocks for all charts      |
| `overrides.<seriesType>.series` | `Record<string, unknown>` | defaults for series of a specific type |
