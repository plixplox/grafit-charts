# Подключение и размер бандла

У пакета три точки входа и отдельный CDN-файл — выбирайте по тому, что
важнее: простота или килобайты.

| Вход                    | Что внутри                                                    | Когда использовать                |
| ----------------------- | ------------------------------------------------------------- | --------------------------------- |
| `grafit-charts`         | всё включено и зарегистрировано: виджеты, серии, оси, фичи    | прототипы, внутренние инструменты |
| `grafit-charts/core`    | движок + `register()`, без единого модуля                     | когда важен размер бандла         |
| `grafit-charts/modules` | все модули именованными экспортами: виджеты, серии, оси, фичи | в паре с `grafit-charts/core`     |

## Полный вход

Самый короткий путь — всё уже зарегистрировано:

```ts
import { Charts } from 'grafit-charts';

Charts.create({ container, data, series: [{ type: 'line', yField: 'y' }] });
```

Цена удобства: в бандл попадает вся библиотека, включая серии, которые вы
не используете (~43 КБ gzip).

## Минимальный бандл: `grafit-charts/core` + `grafit-charts/modules`

Движок не знает ни об одном модуле — серии, оси, виджеты чартов и фичи
подключаются явно, как в ECharts или Chart.js. Всё незарегистрированное
tree-shaking выбрасывает:

```ts
import { Charts, register } from 'grafit-charts/core';
import {
  cartesianChartModule,
  lineSeriesModule,
  categoryAxisModule,
  numberAxisModule,
  tooltipModule,
  legendModule,
} from 'grafit-charts/modules';

register(cartesianChartModule, lineSeriesModule, categoryAxisModule, numberAxisModule, tooltipModule, legendModule);

Charts.create({ container, data, series: [{ type: 'line', yField: 'y' }] });
```

Такой бандл — ~20 КБ gzip против ~43 КБ у полного входа (а без
тултипа и легенды — ~18 КБ).

Регистрируются три вида модулей:

| Вид            | Модули                                                                                                                                                | Что обязательно                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Виджеты чартов | `cartesianChartModule`, `polarChartModule`, `standaloneChartModule`                                                                                   | ровно тот, что нужен вашим сериям (таблица ниже); без него `Charts.create` бросит ошибку |
| Серии и оси    | `lineSeriesModule`, `numberAxisModule`, …                                                                                                             | все используемые типы                                                                    |
| Фичи           | `tooltipModule`, `legendModule`, `gradientLegendModule`, `crosshairModule`, `navigatorModule`, `annotationsModule`, `syncModule`, `contextMenuModule` | по желанию: без регистрации фича просто не работает (с предупреждением в консоли)        |

Имена модулей образуются от типа: `'box-plot'` → `boxPlotSeriesModule`,
`'radial-gauge'` → `radialGaugeSeriesModule`; оси — `numberAxisModule`,
`timeAxisModule` и т. д.

### Какой виджет нужен какой серии

| Виджет                  | Серии                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `cartesianChartModule`  | line, bar, area, scatter, bubble, histogram, heatmap, range-bar, range-area, box-plot, waterfall, funnel, cone-funnel, candlestick, ohlc |
| `polarChartModule`      | pie, donut, radar-line, radar-area, nightingale, radial-column, radial-bar                                                               |
| `standaloneChartModule` | treemap, sunburst, pyramid, sankey, chord, radial-gauge, linear-gauge                                                                    |

Пресеты `createFinancialChart`/`createGauge`/`createSparkline` — это сборка
options поверх обычных серий: financial — candlestick/ohlc (cartesian) +
`ordinalTimeAxisModule`, `navigatorModule`, `crosshairModule`; gauge —
radial-/linear-gauge (standalone); sparkline — line/area/bar (cartesian).

### Какая фича за что отвечает

| Модуль                 | Опции / поведение                                      |
| ---------------------- | ------------------------------------------------------ |
| `tooltipModule`        | `tooltip` — тултип при наведении                       |
| `legendModule`         | `legend` — легенда с переключением серий               |
| `gradientLegendModule` | `gradientLegend` — цветовая шкала heatmap              |
| `crosshairModule`      | `crosshair` — перекрестье с подписями на осях          |
| `navigatorModule`      | `navigator` — полоса диапазона под чартом              |
| `annotationsModule`    | `annotations` — линии/области/подписи на чарте         |
| `syncModule`           | `sync` — синхронизация подсветки и зума между чартами  |
| `contextMenuModule`    | `contextMenu` — правый клик: «Скачать PNG», сброс зума |

Zoom, выделение данных (`selection`), события (`listeners`), темы,
анимация и состояние входят в ядро — отдельной регистрации не требуют.

::: warning Не забудьте оси
Декартовым сериям нужны модули осей. Если оси не заданы в options, чарт
сам подбирает пару: большинству серий — `category` + `number`,
scatter/bubble/histogram — `number` + `number`. Зарегистрируйте те типы,
которые понадобятся, иначе получите ошибку.
:::

::: tip Тултип и легенда — тоже модули
В полном входе они «просто есть», но в `grafit-charts/core` без
`tooltipModule`/`legendModule` чарт молча отрисуется без тултипа и
легенды (предупреждение появится, только если они явно настроены в
options). Если они нужны — зарегистрируйте их.
:::

Если тип не зарегистрирован, чарт бросает понятную ошибку
(сообщения библиотеки — на английском):

```
grafit: series type "sankey" is not registered. Import the module from
'grafit-charts/modules' and pass it to register() from 'grafit-charts/core', or use the
full 'grafit' entry point.
```

Модули ничего не делают при импорте — регистрация происходит только при
явном вызове `register()`. Поэтому пакет честно объявляет
`sideEffects: false`, и бандлеру безопасно выбрасывать неиспользуемое.

## CDN без сборки

Для страниц без бандлера есть самодостаточный файл `dist/grafit.min.js`
(IIFE, все модули зарегистрированы, глобал `Grafit`):

```html
<script src="https://cdn.jsdelivr.net/npm/grafit-charts/dist/grafit.min.js"></script>
<script>
  Grafit.Charts.create({
    container: document.getElementById('chart'),
    data: [{ month: 'Янв', revenue: 42 }],
    series: [{ type: 'bar', xField: 'month', yField: 'revenue' }],
  });
</script>
```

Поля `unpkg`/`jsdelivr` в package.json указывают на этот файл, поэтому
короткий URL `https://cdn.jsdelivr.net/npm/grafit-charts` отдаёт его же.

::: tip ESM-only
npm-пакет распространяется только как ESM (`"type": "module"`); CommonJS
`require('grafit-charts')` не поддерживается. Для `<script>` без бандлера
используйте CDN-файл выше.
:::
