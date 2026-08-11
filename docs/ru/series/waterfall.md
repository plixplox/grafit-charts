# Waterfall

Мост накопления: каждое значение `yField` — изменение, бары растут от накопленной суммы.
`totals` отмечает индексы строк-итогов (бар от нуля до накопленного).

::: chart-example waterfall-basic

## Промежуточные итоги и стили

`totals` — индексы строк-итогов (бар от нуля), цвета по знаку через `item`;
подписи — `label.formatter({ value, isTotal, datum })` (позиции как у bar):

::: chart-example waterfall-styled

| Опция                | Тип                                     | По умолчанию                      | Описание                    |
| -------------------- | --------------------------------------- | --------------------------------- | --------------------------- |
| `xField`             | `string`                                | —                                 | категория и изменение       |
| `yField`             | `string`                                | —                                 | категория и изменение       |
| `totals`             | `number[]`                              | —                                 | индексы строк-итогов        |
| `cornerRadius`       | `Pixels`                                | `2`                               | скругление баров            |
| `label.enabled`      | `boolean`                               | `false`                           | показать подписи значений   |
| `label.placement`    | внешние/`center`/`inner-*` (17 позиций) | `'top'`                           | позиция подписи             |
| `label.formatter`    | `({ value, isTotal, datum }) => string` | значение                          | содержимое подписи          |
| `label.fontSize`     | `Pixels`                                | `11`                              | размер шрифта подписи       |
| `label.fontWeight`   | `string \| number`                      | `normal`                          | насыщенность                |
| `label.fontFamily`   | `string`                                | шрифт темы                        | гарнитура                   |
| `label.color`        | `ColorValue`                            | foreground; внутри — автоконтраст | цвет текста                 |
| `item.positive.fill` | `ColorValue`                            | цвет серии                        | заливка положительных шагов |
| `item.negative.fill` | `ColorValue`                            | красный темы                      | заливка отрицательных шагов |
| `item.total.fill`    | `ColorValue`                            | muted темы                        | заливка итоговых баров      |
| `line.enabled`       | `boolean`                               | `true`                            | соединительные линии        |
| `line.stroke`        | `ColorValue`                            | muted темы                        | цвет соединительных линий   |

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

Подсказке каскада передаётся не одна величина: ступень — это одновременно
разница и накопленный итог, поэтому `tooltip.renderer` получает
`WaterfallTooltipRendererParams` — `{ datum, xValue, delta, total, isTotal, seriesName, color }`.

```js
tooltip: { renderer: ({ xValue, delta, total }) => `${String(xValue)}: ${delta > 0 ? '+' : ''}${delta} → ${total}` },
```

Без рендерера строки называются `Total` и `Cumulative` — оба названия
[ключи локали](/ru/guide/accessibility#локализация).
