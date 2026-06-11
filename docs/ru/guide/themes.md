# Темы

Тема задаёт палитру серий, цвета фона/текста и шрифт. В `theme` передаётся
имя встроенной темы или объект `ThemeOptions`.

## Встроенные темы

`'default'` — светлая (используется без `theme`):

::: chart-example theme-light

`'dark'` — тёмная:

::: chart-example theme-dark

Тему можно менять на лету — `chart.updateDelta({ theme: 'dark' })`
перерисует чарт с анимацией. Демки на этом сайте так и переключаются
вместе с темой страницы (если пример не задаёт тему явно).

## Кастомная тема

Объект темы: `baseTheme` (основа) + `palette` (цвета серий по кругу) +
`params` (дизайн-токены):

::: chart-example theme-custom

Цвет, заданный в серии (`fill`, `stroke`), имеет приоритет над палитрой темы.

## Overrides

`overrides` — частичные options, вклеиваемые под пользовательские:
`common` — chart-блоки для всех чартов, `<seriesType>.series` — дефолты
серий данного типа. Удобно вынести фирменный стиль в один объект:

::: chart-example theme-overrides

Приоритет: дефолты библиотеки < `overrides.common` <
`overrides[type].series` < явные options.

## Опции ThemeOptions

| Опция                           | Тип                       | Описание                              |
| ------------------------------- | ------------------------- | ------------------------------------- |
| `baseTheme`                     | `'default' \| 'dark'`     | базовая тема-основа                   |
| `palette.fills`                 | `ColorValue[]`              | цвета заливки серий, по индексу серии |
| `palette.strokes`               | `ColorValue[]`              | цвета обводки (по умолчанию = fills)  |
| `params.backgroundColor`        | `ColorValue`                | фон чарта                             |
| `params.foregroundColor`        | `ColorValue`                | основной цвет текста                  |
| `params.fontFamily`             | `string`                  | шрифт всех надписей                   |
| `overrides.common`              | `Record<string, unknown>` | chart-блоки для всех чартов           |
| `overrides.<seriesType>.series` | `Record<string, unknown>` | дефолты серий конкретного типа        |
