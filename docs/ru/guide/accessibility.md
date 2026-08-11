# Доступность и локализация

## Клавиатура

Canvas чарта фокусируем (`Tab`); в фокусе:

| Клавиша   | Действие                                                    |
| --------- | ----------------------------------------------------------- |
| `→` / `←` | следующая/предыдущая точка первой видимой серии (подсветка) |
| `Esc`     | сброс подсветки                                             |

Контейнер получает `role="img"` и `aria-label` из `title.text`; подсвеченная точка анонсируется скринридерам через скрытый `aria-live`-регион.

## Локализация

Встроенные строки переопределяются через `locale.localeText`:

```ts
Charts.create({
  ...,
  locale: {
    localeText: {
      loading: 'Loading…',
      noData: 'No data to display',
      downloadPng: 'Download PNG',
      resetZoom: 'Reset zoom',
    },
  },
});
```

Ключи: `loading`, `noData` (оверлеи), `downloadPng`, `resetZoom` (контекстное меню).
Тексты осей и легенды приходят из ваших данных и `formatter`-ов, поэтому
отдельной локализации не требуют — как и большинство подсказок.

Исключение — подсказка, которая разбирает величину на части: части ей
приходится называть самой, и это уже слова библиотеки, а не ваши. Они тоже
ключи:

| Серия | Ключи | По умолчанию |
| ----- | ----- | ------------ |
| каскад | `waterfallTotal`, `waterfallCumulative` | `Total`, `Cumulative` |
| ящик с усами | `boxPlotMax`, `boxPlotQ3`, `boxPlotMedian`, `boxPlotQ1`, `boxPlotMin` | `max`, `q3`, `median`, `q1`, `min` |
| свечи, OHLC | `ohlcOpen`, `ohlcHigh`, `ohlcLow`, `ohlcClose` | `O`, `H`, `L`, `C` |

```ts
locale: {
  localeText: {
    waterfallTotal: 'Итог',
    waterfallCumulative: 'Накопленный итог',
    boxPlotMedian: 'Медиана',
  },
},
```

`tooltip.renderer` пишет подсказку целиком и ни одному ключу не подчиняется.

## Опции

| Опция               | Тип                                  | Описание                 |
| ------------------- | ------------------------------------ | ------------------------ |
| `locale.localeText` | `Partial<Record<LocaleKey, string>>` | переопределение строк UI |

Ключи `LocaleKey`: `loading`, `noData`, `downloadPng`, `resetZoom` и ключи
подсказок выше — значения по умолчанию лежат в `DEFAULT_LOCALE`.

Клавиатура (включена всегда): стрелки — перемещение подсветки по точкам
серии, `Escape` — сброс подсветки и зума. Состояние анонсируется через
ARIA live-region.
