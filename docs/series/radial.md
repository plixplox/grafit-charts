# Nightingale and Radial Column

Sector-based polar series: the category defines the angular band, the value the radius.

## Nightingale

The series occupies the entire category band (Nightingale rose):

::: chart-example nightingale-basic

## Radial Column

Several series share the band (the polar counterpart of grouped bars):

::: chart-example radial-column-basic

## Radial Bar

Inverted layout: categories are rings along the radius, the value is an arc along the angle
(`angleField` is the category, `radiusField` the value):

::: chart-example radial-bar-basic

## Options

Options common to all series (`name`, `showInLegend`, `tooltip.renderer`, …) are covered in [Common series options](/guide/series-options).

| Option        | Type         | Default       | Description    |
| ------------- | ------------ | ------------- | -------------- |
| `angleField`  | `string`     | —             | data keys      |
| `radiusField` | `string`     | —             | data keys      |
| `name`        | `string`     | `radiusField` | series name    |
| `fill`        | `ColorValue` | palette       | sector fill    |
| `fillOpacity` | `Fraction`   | `0.85`        | sector fill    |
| `stroke`      | `ColorValue` | background    | stroke         |
| `strokeWidth` | `Pixels`     | `1`           | stroke         |
