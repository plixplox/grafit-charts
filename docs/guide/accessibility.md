# Accessibility and Localization

## Keyboard

The chart canvas is focusable (`Tab`); while focused:

| Key       | Action                                                         |
| --------- | -------------------------------------------------------------- |
| `→` / `←` | next/previous point of the first visible series (highlighting) |
| `Esc`     | clear the highlight                                            |

The container gets `role="img"` and an `aria-label` from `title.text`; the
highlighted point is announced to screen readers via a hidden `aria-live`
region.

## Localization

Built-in strings are overridden via `locale.localeText`:

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

Keys: `loading`, `noData`, `renderError` (overlays), `downloadPng`, `resetZoom`
(context menu). Axis and legend texts come from your data and your `formatter`s, so
they need no separate localization — and neither do most tooltips.

A tooltip that takes a value apart is the exception: it has to name the pieces
itself, and those names are the library's own words rather than yours. Those
are keys too:

| Series | Keys | Default |
| ------ | ---- | ------- |
| waterfall | `waterfallTotal`, `waterfallCumulative` | `Total`, `Cumulative` |
| box plot | `boxPlotMax`, `boxPlotQ3`, `boxPlotMedian`, `boxPlotQ1`, `boxPlotMin` | `max`, `q3`, `median`, `q1`, `min` |
| candlestick, OHLC | `ohlcOpen`, `ohlcHigh`, `ohlcLow`, `ohlcClose` | `O`, `H`, `L`, `C` |
| histogram over calendar bins | `quarter` | `Q` |

```ts
locale: {
  localeText: {
    waterfallTotal: 'Итог',
    waterfallCumulative: 'Накопленный итог',
    boxPlotMedian: 'Медиана',
  },
},
```

A `tooltip.renderer` writes the whole tooltip and answers to no key at all.

## Options

| Option              | Type                                 | Description         |
| ------------------- | ------------------------------------ | ------------------- |
| `locale.localeText` | `Partial<Record<LocaleKey, string>>` | UI string overrides |

`LocaleKey` keys: `loading`, `noData`, `downloadPng`, `resetZoom`, plus the
tooltip keys above — the defaults live in `DEFAULT_LOCALE`.

Keyboard support (always on): arrow keys move the highlight across the
series' points, `Escape` clears the highlight and the zoom. State is
announced via an ARIA live region.
