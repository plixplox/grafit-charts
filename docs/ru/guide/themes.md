# Темы

Тема — это набор дизайн-токенов, из которого чарт берёт всё оформление: палитру
серий, цвета фона и текста, базовый кегль, толщину линий, скругление и
прозрачность марок, семантические цвета роста и падения, вид осей. В `theme`
передаётся имя встроенной темы или объект `ThemeOptions`.

Собирать тему руками необязательно — в [конструкторе тем](/guide/theme-builder)
на каждый токен есть контрол, живые превью и экспорт в JSON (страница на английском).

## Встроенные темы

В библиотеке семь пресетов. Их имена экспортируются как `THEME_NAMES` — селекту
не нужен захардкоженный список:

```ts
import { Charts, THEME_NAMES, type ThemeName } from 'grafit-charts';

for (const name of THEME_NAMES) select.append(new Option(name, name));
void chart.updateDelta({ theme: select.value as ThemeName });
```

| Имя          | Фон     | Что это                                                                        |
| ------------ | ------- | ------------------------------------------------------------------------------ |
| `'default'`  | светлый | нейтральная светлая тема, используется без `theme`                             |
| `'dark'`     | тёмный  | нейтральная тёмная тема                                                        |
| `'vibrant'`  | светлый | насыщенные цвета в порядке, при котором соседние не сливаются у дальтоников    |
| `'muted'`    | светлый | приглушённая палитра на тёплом фоне                                            |
| `'mono'`     | светлый | один тон от светлого к тёмному — для этапов и уровней, не для разных категорий |
| `'contrast'` | светлый | все цвета серий держат 3:1, включены тики, сплошная сетка, толстые линии       |
| `'midnight'` | тёмный  | тёмная тема с синим отливом, палитра подобрана под более тёмный фон            |

`'default'` — светлая (используется без `theme`):

::: chart-example theme-light

`'dark'` — тёмная:

::: chart-example theme-dark

`'contrast'` — тема с упором на доступность: меняет не только цвета, но и вид осей:

::: chart-example theme-preset-contrast

Тему можно менять на лету — `chart.updateDelta({ theme: 'dark' })`
перерисует чарт с анимацией. Демки на этом сайте так и переключаются
вместе с темой страницы (если пример не задаёт тему явно).

::: tip Палитры и цветовое зрение
`'vibrant'`, `'contrast'` и `'midnight'` проверены симуляцией цветового зрения:
соседние цвета серий не сливаются при протанопии и дейтеранопии. `'muted'` ближе
к границе — подходит для четырёх серий или вместе с подписями значений. Палитра
`'default'` и `'dark'` появилась раньше этой проверки и сохраняет опубликованные
цвета ради совместимости.
:::

## Кастомная тема

Объект темы: `baseTheme` (основа) + `palette` (цвета серий по кругу) +
`params` (дизайн-токены) + `axis` (оформление осей):

::: chart-example theme-custom

Цвет, заданный в серии (`fill`, `stroke`), имеет приоритет над палитрой темы.

## Дизайн-токены

В `params` по одному значению на токен — оно применяется сразу ко всем типам серий:

::: chart-example theme-tokens

Три токена ведут себя иначе остальных. `cornerRadius` и `fillOpacity` **по
умолчанию не заданы**: встроенные значения различаются намеренно — столбец
прямоугольный, а range-bar скруглённый, area заливается с 0.35, а маркер с 0.85.
Не задавайте их — каждая марка сохранит своё значение; задайте — они перекроют
все сразу.

`fontSize` — **базовый** кегль, по умолчанию 11. Остальные подписи отсчитываются
от него фиксированным смещением: подписи осей — на базе, легенда и заголовки осей
на шаг выше, заголовок чарта — на шесть. Смена базы двигает всю шкалу, сохраняя
иерархию.

## Оформление осей

`ChartOptions.axes` — массив, и `overrides` до него не дотягивается: для этого
есть блок `axis`. В нём сразу переключатели, размеры и цвета всех осей:

```ts
theme: {
  baseTheme: 'default',
  axis: {
    tick: true,
    tickSize: 4,
    gridDash: [],
    gridColor: '#eceff3',
    labelSize: 12,
    titleColor: '#1f2733',
  },
}
```

Три переключателя работают как общий выключатель: выключенный гасит элемент
везде, включённый оставляет обычное правило (сетка на оси значений, линия на оси
категорий). Чтобы включить сетку там, где правило её убрало, задайте её на самой оси.

Цвета — необязательное уточнение. Не трогаете `color`, `gridColor` и `tickColor` —
все трое идут за `params.axisColor`; не трогаете `labelColor` — он идёт за
`params.mutedColor`, `titleColor` за `params.foregroundColor`. Задали один —
изменится только он.

## Легенда и тултип

Это обычные блоки `ChartOptions`, поэтому тема достаёт до них через
`overrides.common` — отдельных токенов для них нет, потому что два пути к одному
пикселю хуже одного:

```ts
theme: {
  baseTheme: 'dark',
  overrides: {
    common: {
      legend: { position: 'right', item: { label: { fontSize: 13 } }, background: { fill: '#1b1f27', cornerRadius: 8 } },
      tooltip: { background: '#11151c', borderColor: '#2b313b', borderRadius: 10 },
    },
  },
}
```

Так доступно всё из `LegendOptions` и `TooltipOptions`, а чарт, задавший ту же
опцию сам, по-прежнему выигрывает.

## Overrides

`overrides` — частичные options, вклеиваемые под пользовательские:
`common` — chart-блоки для всех чартов, `<seriesType>.series` — дефолты
серий данного типа. Это способ дотянуться до всего, что токены выразить не могут:
стилей отдельного типа серий и нестилевых опций вроде `legend.position`.

::: chart-example theme-overrides

Приоритет: дефолты библиотеки < токены темы < `overrides.common` <
`overrides[type].series` < явные options. Токены ниже `overrides`, потому что
overrides вмерживаются в options ещё до того, как рендер обратится к теме.

## Опции ThemeOptions

| Опция                           | Тип                       | Описание                                                      |
| ------------------------------- | ------------------------- | ------------------------------------------------------------- |
| `baseTheme`                     | `ThemeName`               | базовая тема-основа                                           |
| `palette.fills`                 | `ColorValue[]`            | цвета заливки серий, по индексу серии                         |
| `palette.strokes`               | `ColorValue[]`            | цвета обводки (по умолчанию = fills)                          |
| `palette.sequential`            | `ColorValue[]`            | шкала для серий с `colorField` и градиентной легенды          |
| `params.backgroundColor`        | `ColorValue`              | фон чарта                                                     |
| `params.foregroundColor`        | `ColorValue`              | основной цвет текста                                          |
| `params.mutedColor`             | `ColorValue`              | вторичный текст: подписи осей, подзаголовок, значения легенды |
| `params.axisColor`              | `ColorValue`              | линии осей, тики и сетка                                      |
| `params.fontFamily`             | `string`                  | шрифт всех надписей                                           |
| `params.fontSize`               | `Pixels`                  | базовый кегль (11), остальные размеры двигаются вместе с ним  |
| `params.strokeWidth`            | `Pixels`                  | толщина линий данных — line, area и radar                     |
| `params.lineDash`               | `Pixels[]`                | штрих линий данных; `[]` — сплошные                           |
| `params.markStrokeWidth`        | `Pixels`                  | толщина обводки заливок — столбцов, секторов, боксов          |
| `params.cornerRadius`           | `Pixels`                  | скругление всех прямоугольных марок; не задан — у каждой своё |
| `params.fillOpacity`            | `Fraction`                | прозрачность всех заливок; не задан — у каждой марки своя     |
| `params.positiveColor`          | `ColorValue`              | рост: candlestick, ohlc                                       |
| `params.negativeColor`          | `ColorValue`              | падение: candlestick, ohlc, отрицательные столбцы waterfall   |
| `axis.line`                     | `boolean`                 | линия оси                                                     |
| `axis.tick`                     | `boolean`                 | засечки                                                       |
| `axis.gridLine`                 | `boolean`                 | линии сетки (и полярная паутина)                              |
| `axis.strokeWidth`              | `Pixels`                  | толщина линии оси, засечек и сетки                            |
| `axis.gridDash`                 | `Pixels[]`                | штрих сетки; `[]` — сплошная линия                            |
| `axis.lineDash`                 | `Pixels[]`                | штрих самой линии оси; по умолчанию сплошная                  |
| `axis.color`                    | `ColorValue`              | только линия оси; по умолчанию `params.axisColor`             |
| `axis.gridColor`                | `ColorValue`              | только сетка; по умолчанию `params.axisColor`                 |
| `axis.tickColor`                | `ColorValue`              | только засечки; по умолчанию `params.axisColor`               |
| `axis.tickSize`                 | `Pixels`                  | длина засечки (6)                                             |
| `axis.labelColor`               | `ColorValue`              | подписи делений; по умолчанию `params.mutedColor`             |
| `axis.labelSize`                | `Pixels`                  | кегль подписей; по умолчанию `params.fontSize`                |
| `axis.labelSpacing`             | `Pixels`                  | зазор между линией оси и подписями (8)                        |
| `axis.titleColor`               | `ColorValue`              | заголовок оси; по умолчанию `params.foregroundColor`          |
| `axis.titleSize`                | `Pixels`                  | кегль заголовка оси; на шаг выше `params.fontSize`            |
| `overrides.common`              | `Record<string, unknown>` | chart-блоки для всех чартов                                   |
| `overrides.<seriesType>.series` | `Record<string, unknown>` | дефолты серий конкретного типа                                |
