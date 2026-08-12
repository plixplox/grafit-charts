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

## Вертикальный гейдж с зонами

`orientation: 'vertical'` ставит шкалу вертикально. С `segments` дорожка
показывает качественные зоны, а значение идёт поверх них полосой поменьше —
как читается bullet chart; `label.formatter` и `ticks.formatter` задают формат
чисел:

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
  label: { formatter: (value) => `${(value / 1e6).toFixed(1)} млн м³` },
  ticks: { formatter: (value) => `${value / 1e6} млн` },
}
```

::: chart-example gauge-vertical

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

| Опция    | Тип          | Описание         |
| -------- | ------------ | ---------------- |
| `value`  | `number`     | текущее значение |
| `needle` | `Switchable` | стрелка (radial) |
| `target` | `number`     | целевая отметка  |

### Полный список опций

`segments` и `target` есть у обоих гейджей; `orientation` — у линейного, углы
и стрелка — у круглого. Гейдж сам подбирает размер текста и толщину под
доставшееся ему место — опции ниже нужны только там, где значения по умолчанию
не подходят плитке.

| Опция              | Тип                          | По умолчанию             | Описание                          |
| ------------------ | ---------------------------- | ------------------------ | --------------------------------- |
| `startAngle`       | `Degrees`                    | `-110`                   | дуга radial-gauge                 |
| `endAngle`         | `Degrees`                    | `110`                    | дуга radial-gauge                 |
| `orientation`      | `'horizontal' \| 'vertical'` | `'horizontal'`           | направление шкалы linear-gauge    |
| `fills`            | `ColorValue[]`               | палитра                  | цвета (если не заданы `segments`) |
| `thickness`        | `Pixels`                     | доля от места, `14`…`36` | толщина полосы/дуги               |
| `scale.min`        | `number`                     | `0`                      | минимум шкалы                     |
| `scale.max`        | `number`                     | `100`                    | максимум шкалы                    |
| `target`           | `number`                     | —                        | отметка цели поперёк полосы/дуги  |
| `targetColor`      | `ColorValue`                 | foreground темы          | цвет отметки цели                 |
| `segments[]`       | `{ to, color }[]`            | —                        | цветовые зоны шкалы               |
| `label.enabled`    | `boolean`                    | `true`                   | значение в центре/рядом           |
| `label.formatter`  | `(value) => string`          | значение                 | формат значения                   |
| `label.fontSize`   | `Pixels`                     | по размеру гейджа        | размер значения                   |
| `label.fontWeight` | `FontWeight`                 | `'bold'`                 | насыщенность значения             |
| `label.fontFamily` | `string`                     | шрифт темы               | гарнитура значения                |
| `label.color`      | `ColorValue`                 | foreground темы          | цвет значения                     |
| `ticks.enabled`    | `boolean`                    | `true`                   | подписи концов шкалы              |
| `ticks.formatter`  | `(value) => string`          | значение границы         | формат подписей концов            |
| `ticks.fontSize`   | `Pixels`                     | размер подписей темы     | размер подписей концов            |
| `ticks.fontWeight` | `FontWeight`                 | `'normal'`               | насыщенность подписей концов      |
| `ticks.fontFamily` | `string`                     | шрифт темы               | гарнитура подписей концов         |
| `ticks.color`      | `ColorValue`                 | muted темы               | цвет подписей концов              |

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

`tooltip.renderer` получает `NodeTooltipRendererParams` — `{ label, value, share, color }`,
где `value` — то число, которое показывает индикатор.
