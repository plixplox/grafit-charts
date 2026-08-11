# Gauges

Гейджи — серии без данных: значение задаётся прямо в options.

## Radial gauge

::: chart-example gauge-radial

## Linear gauge

Линейная шкала с целевой отметкой (bullet):

::: chart-example gauge-linear

## Цель на линейном гейдже

`target` — отметка цели, `thickness` — высота полосы:

::: chart-example gauge-target

## Пресет

```ts
Charts.createGauge({
  container,
  type: 'radial-gauge', // | 'linear-gauge'
  value: 67,
  scale: { min: 0, max: 100 },
  title: 'Загрузка кластера',
});
```

| Опция    | Тип          | Описание                 |
| -------- | ------------ | ------------------------ |
| `value`  | `number`     | текущее значение         |
| `needle` | `Switchable` | стрелка (radial)         |
| `target` | `number`     | целевая отметка (linear) |

### Полный список опций

| Опция             | Тип                 | По умолчанию                         | Описание                          |
| ----------------- | ------------------- | ------------------------------------ | --------------------------------- |
| `startAngle`      | `Degrees`           | `-110`                               | дуга radial-gauge                 |
| `endAngle`        | `Degrees`           | `110`                                | дуга radial-gauge                 |
| `fills`           | `ColorValue[]`      | палитра                              | цвета (если не заданы `segments`) |
| `thickness`       | `Pixels`            | linear `16`; radial авто (мин. `10`) | толщина полосы/дуги               |
| `scale.min`       | `number`            | `0`                                  | минимум шкалы                     |
| `scale.max`       | `number`            | `100`                                | максимум шкалы                    |
| `label.enabled`   | `boolean`           | `true`                               | значение в центре/рядом           |
| `label.formatter` | `(value) => string` | значение                             | формат значения                   |
| `segments[]`      | `{ to, color }[]`   | —                                    | цветовые зоны radial-gauge        |

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).


`tooltip.renderer` получает `NodeTooltipRendererParams` — `{ label, value, share, color }`,
где `value` — то число, которое показывает индикатор.
