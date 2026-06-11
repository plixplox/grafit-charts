# Sankey и Chord

Потоковые серии: рёбра `fromField → toField` с весом `sizeField`.

## Sankey

Узлы раскладываются по колонкам топологической глубины, толщина связей
пропорциональна потоку.

::: chart-example sankey-basic

### Подписи и настройка узлов

`label` (шрифт, цвет, `formatter({ name, total })`), `node.width`/`node.spacing`
и `linkOpacity`:

::: chart-example sankey-labels

## Chord

Узлы по кругу, ленты — взаимные потоки.

::: chart-example chord-basic

### Отступы и подписи

`nodeSpacing` — зазор между дугами (px по внутреннему радиусу), `linkOpacity` —
плотность лент, `label.formatter` получает имя и сумму узла:

::: chart-example chord-spacing

## Опции

Общие опции всех серий (`name`, `showInLegend`, `tooltip.renderer`, …) — в разделе [Общие опции серий](/ru/guide/series-options).

| Опция       | Серии | Описание                     |
| ----------- | ----- | ---------------------------- |
| `fromField` | обе   | рёбра графа потоков          |
| `toField`   | обе   | рёбра графа потоков          |
| `sizeField` | обе   | рёбра графа потоков          |
| `fills`     | обе   | цвета узлов по кругу палитры |

### Полный список опций

| Опция              | Тип                           | По умолчанию | Описание                        |
| ------------------ | ----------------------------- | ------------ | ------------------------------- |
| `linkOpacity`      | обе                           | `0.35`       | прозрачность лент потоков       |
| `nodeSpacing`      | chord                         | `12`         | зазор между дугами узлов, px    |
| `label.enabled`    | `boolean`                     | `true`       | подписи узлов                   |
| `label.formatter`  | `({ name, total }) => string` | имя узла     | содержимое                      |
| `label.fontSize`   | `Pixels`                   | `11`         | размер шрифта подписи           |
| `label.fontWeight` | `string \| number`            | `normal`     | насыщенность                    |
| `label.fontFamily` | `string`                      | шрифт темы   | гарнитура                       |
| `label.color`      | `ColorValue`                    | foreground   | цвет                            |
| `node.width`       | `Pixels`                   | `14`         | ширина узла sankey              |
| `node.spacing`     | `Pixels`                   | `14`         | вертикальный зазор узлов sankey |
