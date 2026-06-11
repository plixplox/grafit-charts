# Bar

Столбчатая серия. Категории — по `xField`, значения растут от нуля.

::: chart-example bar-basic

## Подписи значений

`label.placement`: внешние позиции `top`/`bottom`/`left`/`right` и углы
(`top-left`, …), `center` и внутренние `inner-top`, `inner-top-left` и т.д. —
внутри бара цвет подбирается автоконтрастом с ореолом цвета бара:

::: chart-example bar-labels

## Стилизация

`cornerRadius`, своя заливка с прозрачностью и обводка:

::: chart-example bar-styled

## Группировка

Несколько bar-серий автоматически делят бэнд категории:

::: chart-example bar-grouped

## Стекинг

`stacked: true` складывает серии друг на друга; `stackGroup` позволяет вести несколько независимых стеков. Отрицательные значения копятся вниз от нуля.

::: chart-example bar-stacked

### Группированные стеки

`stackGroup` собирает серии в независимые стеки: группы стоят рядом внутри
категории (серии со `stacked: true` без `stackGroup` складываются в общий стек):

::: chart-example bar-grouped-stacks

### Нормализованный стек (100%)

`normalizedTo` приводит итог каждой категории к заданному значению:

::: chart-example bar-normalized

## Группированные категории

Для иерархических категорий (год → квартал) используйте ось
[`grouped-category`](/ru/guide/axes#иерархические-категории):

::: chart-example axis-grouped

## Горизонтальные бары

`direction: 'horizontal'` разворачивает чарт: категории уходят на вертикальную ось.

::: chart-example bar-horizontal

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция              | Тип                                     | По умолчанию                      | Описание                                         |
| ------------------ | --------------------------------------- | --------------------------------- | ------------------------------------------------ |
| `xField`           | `string`                                | —                                 | ключи данных (обязательны)                       |
| `yField`           | `string`                                | —                                 | ключи данных (обязательны)                       |
| `name`             | `string`                                | `yField`                          | имя для легенды и тултипа                        |
| `direction`        | `'vertical' \| 'horizontal'`            | `'vertical'`                      | направление баров                                |
| `stacked`          | `boolean`                               | `false`                           | стекинг                                          |
| `normalizedTo`     | `number`                                | —                                 | нормализация итога стека (100 — процентный стек) |
| `stackGroup`       | `string`                                | `'default'`                       | независимые группы стека                         |
| `fill`             | `ColorValue`                              | палитра темы                      | заливка                                          |
| `fillOpacity`      | `Fraction`                                 | `1`                               | прозрачность заливки                             |
| `stroke`           | `ColorValue`                              | —                                 | обводка                                          |
| `strokeWidth`      | `Pixels`                             | —                                 | обводка                                          |
| `cornerRadius`     | `Pixels`                             | `0`                               | скругление углов                                 |
| `label.enabled`    | `boolean`                               | `false`                           | показать подписи значений                        |
| `label.placement`  | внешние/`center`/`inner-*` (17 позиций) | `'top'`                           | позиция подписи                                  |
| `label.formatter`  | `({ value, datum }) => string`          | значение                          | содержимое подписи                               |
| `label.fontSize`   | `Pixels`                             | `11`                              | размер шрифта подписи                            |
| `label.fontWeight` | `string \| number`                      | `normal`                          | насыщенность                                     |
| `label.fontFamily` | `string`                                | шрифт темы                        | гарнитура                                        |
| `label.color`      | `ColorValue`                              | foreground; внутри — автоконтраст | цвет текста                                      |
