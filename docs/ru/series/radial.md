# Nightingale и Radial Column

Секторные полярные серии: категория задаёт угловой бэнд, значение — радиус.

## Nightingale

Серия занимает весь бэнд категории (роза Найтингейл):

::: chart-example nightingale-basic

## Radial Column

Несколько серий делят бэнд (полярный аналог сгруппированных баров):

::: chart-example radial-column-basic

## Radial Bar

Инверсная раскладка: категории — кольца по радиусу, значение — дуга по углу
(`angleField` — категория, `radiusField` — значение):

::: chart-example radial-bar-basic

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция         | Тип         | По умолчанию  | Описание         |
| ------------- | ----------- | ------------- | ---------------- |
| `angleField`  | `string`    | —             | ключи данных     |
| `radiusField` | `string`    | —             | ключи данных     |
| `name`        | `string`    | `radiusField` | имя серии        |
| `fill`        | `ColorValue`  | палитра       | заливка секторов |
| `fillOpacity` | `Fraction`     | `0.85`        | заливка секторов |
| `stroke`      | `ColorValue`  | фон           | обводка          |
| `strokeWidth` | `Pixels` | `1`           | обводка          |
| `groupGap`    | `Fraction` | `0.2`       | зазор между секторами одной группы (radial-column) |
| `sectorSpacing` | `Pixels` | `1`         | зазор постоянной ширины между соседними секторами |
