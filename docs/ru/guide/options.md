# Конфигурация

Чарт полностью описывается одним объектом `ChartOptions` — он сериализуем,
типобезопасен и одинаково работает в `Charts.create` и `chart.update`.

Минимальный рабочий пример:

```ts
import { Charts } from 'grafit-charts';

const chart = Charts.create({
  container: document.getElementById('app')!, // куда рендерить
  data: [
    { month: 'Янв', plan: 120, fact: 134 },
    { month: 'Фев', plan: 125, fact: 118 },
  ],
  series: [
    { type: 'bar', xField: 'month', yField: 'plan', name: 'План' },
    { type: 'line', xField: 'month', yField: 'fact', name: 'Факт' },
  ],
});
```

Этого достаточно: оси, легенда, тултипы, подсветка и анимация входа включены
по умолчанию.

## Данные и серии

`data` — массив плоских объектов. Серии не содержат данных — они ссылаются на
поля через `xField`/`yField` (у специализированных серий свои поля:
`angleField`, `sizeField`, `openField`…).

`series` — **discriminated union** по полю `type`: после `type: 'bar'`
TypeScript подсказывает только опции бара и не даст передать чужие. Все 27
типов серий перечислены в разделе «Серии», их общие опции — на странице
[Общие опции серий](/ru/guide/series-options).

## Оси

Если `axes` не заданы, виджет создаёт их сам: `category` снизу + `number`
слева (для горизонтальных баров — наоборот; scatter/histogram просят числовую
X-ось; heatmap — категориальные без линий и сетки). Явный блок `axes` нужен,
когда требуется второй тип оси, формат подписей, crossLines и т.п. — см.
[Оси](/ru/guide/axes).

```ts
axes: [
  { type: 'time', position: 'bottom', label: { format: '%d %b' } },
  { type: 'number', position: 'left', nice: true },
],
```

## Размер

Без `width`/`height` чарт следует за контейнером через `ResizeObserver` —
задайте контейнеру размеры CSS-ом. Числа `width`/`height` фиксируют размер.

## Заголовки, поля, фон

| Опция                | Тип         | По умолчанию | Описание                    |
| -------------------- | ----------- | ------------ | --------------------------- |
| `title.text`         | `string`    | —            | заголовок чарта             |
| `title.textAlign`    | `'left' \| 'center' \| 'right'` | `'center'` | горизонтальное выравнивание |
| `title.fontSize`     | `Pixels` | `17`         | размер шрифта заголовка     |
| `title.color`        | `ColorValue`  | foreground   | цвет                        |
| `title.position`     | `'top' \| 'bottom'` | `'top'` | над или под областью построения |
| `title.spacing`      | `Pixels` | `8`          | отступ под заголовком (до подзаголовка или графика) |
| `title.wrap`         | `boolean` | `true`      | переносить длинный текст на несколько строк |
| `subtitle.text`      | `string`    | —            | подзаголовок (приглушённый, те же опции) |
| `subtitle.spacing`   | `Pixels` | `8`          | отступ между подзаголовком и графиком |
| `padding`            | `PaddingValue` | `{ top: 12, right: 20, bottom: 12, left: 20 }` | внешние поля чарта: `12`, `[12, 20]`, `[12, 20, 12, 20]` или `{ top, right, bottom, left }` |
| `background.fill`    | `ColorValue`  | фон темы     | заливка подложки            |
| `background.visible` | `boolean`   | `true`       | рисовать ли фон             |

Все опции заголовков с живыми примерами: [Заголовок и подзаголовок](/ru/interactivity/captions).

## Оверлеи и загрузка

| Опция                   | Тип       | По умолчанию | Описание                            |
| ----------------------- | --------- | ------------ | ----------------------------------- |
| `loading`               | `boolean` | `false`      | показать оверлей «Загрузка данных…» |
| `overlays.loading.text` | `string`  | из `locale`  | текст оверлея загрузки              |
| `overlays.noData.text`  | `string`  | из `locale`  | текст при пустых `data`             |

## Конвенции

- **`*Field` / `*Name`** — пары «ключ данных / отображаемое имя»: `*Field`
  указывает на поле в `data`, `*Name` показывается в легенде и тултипе.
- **`{ enabled }`** — каждый опциональный блок (`legend`, `tooltip`,
  `axis.label`, `series.marker`, …) включается/выключается этим флагом; блок
  без `enabled: false` включён.
- **`format` / `formatter`** — формат значений строкой (`',.2f'`, `'.0%'`,
  `'%d %b'`) или функцией; функции — изолированные листья, остальной объект
  сериализуем в JSON.
- Мутации переданного объекта не отслеживаются — обновляйте чарт методами.

## Обновление и методы инстанса

```ts
await chart.updateDelta({ theme: 'dark' }); // точечное изменение
await chart.update(buildOptions(newData)); // полная замена
```

| Метод                            | Описание                                                      |
| -------------------------------- | ------------------------------------------------------------- |
| `update(options)`                | полная замена options; Promise резолвится после рендера       |
| `updateDelta(patch)`             | глубокий merge: объекты сливаются, массивы заменяются целиком |
| `getOptions()`                   | текущие options                                               |
| `getState()` / `setState(state)` | зум и скрытые серии — см. [Состояние](/ru/interactivity/state)   |
| `waitForUpdate()`                | дождаться рендера (и догрузки веб-шрифтов)                    |
| `getImageDataURL(opts?)`         | PNG/JPEG как data-URL                                         |
| `download(opts?)`                | скачать изображение (`{ fileName?, fileFormat? }`)            |
| `destroy()`                      | освободить DOM и подписки                                     |

## Все корневые блоки

| Блок                                  | Что делает                         | Подробнее                                    |
| ------------------------------------- | ---------------------------------- | -------------------------------------------- |
| `container`, `data`, `series`, `axes` | основа чарта                       | выше на этой странице                        |
| `width`, `height`                     | фиксированный размер               | [Размер](#размер)                            |
| `title`, `subtitle`                   | заголовки                          | [Заголовки](#заголовки-поля-фон)             |
| `padding`, `background`               | поля и фон                         | [Заголовки](#заголовки-поля-фон)             |
| `loading`, `overlays`                 | оверлеи                            | [Оверлеи](#оверлеи-и-загрузка)               |
| `theme`                               | имя темы или объект                | [Темы](/ru/guide/themes)                        |
| `fonts`                               | перерисовка после загрузки шрифта  | [Темы](/ru/guide/themes#веб-шрифты)             |
| `legend`                              | легенда                            | [Легенда](/ru/interactivity/legend)             |
| `gradientLegend`                      | цветовая шкала colorField-серий    | [Heatmap](/ru/series/heatmap)                   |
| `tooltip`                             | тултипы (режимы, позиция, захват)  | [Тултип](/ru/interactivity/tooltip)             |
| `highlight`                           | подсветка и приглушение при ховере | [Тултип](/ru/interactivity/tooltip)             |
| `crosshair`                           | перекрестие                        | [Crosshair](/ru/interactivity/crosshair)        |
| `zoom`, `navigator`                   | зум и полоса диапазона             | [Zoom](/ru/interactivity/zoom)                  |
| `sync`                                | синхронизация нескольких чартов    | [Состояние](/ru/interactivity/state)            |
| `selection`                           | выбор данных                       | [Выделение данных](/ru/interactivity/selection) |
| `listeners`                           | события чарта                      | [События](/ru/interactivity/listeners)          |
| `annotations`                         | линии/диапазоны/текст на чарте     | [Аннотации](/ru/interactivity/annotations)      |
| `animation`                           | вход и обновления                  | [Состояние](/ru/interactivity/state)            |
| `initialState`                        | стартовый зум/скрытые серии        | [Состояние](/ru/interactivity/state)            |
| `contextMenu`                         | меню по правому клику              | [Состояние](/ru/interactivity/state)            |
| `locale`                              | строки UI                          | [Доступность](/ru/guide/accessibility)          |
