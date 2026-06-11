# Accessibility and Localization

## Keyboard

The chart canvas is focusable (`Tab`); while focused:

| Key       | Action                                                          |
| --------- | --------------------------------------------------------------- |
| `→` / `←` | next/previous point of the first visible series (highlighting)  |
| `Esc`     | clear the highlight                                             |

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

Keys: `loading`, `noData` (overlays), `downloadPng`, `resetZoom` (context
menu). Axis, legend and tooltip texts come from your data and your
`formatter`s, so they need no separate localization.

## Options

| Option              | Type                                 | Description             |
| ------------------- | ------------------------------------ | ----------------------- |
| `locale.localeText` | `Partial<Record<LocaleKey, string>>` | UI string overrides     |

`LocaleKey` keys: `loading`, `noData`, `downloadPng`, `resetZoom` — the
default Russian strings live in `DEFAULT_LOCALE`.

Keyboard support (always on): arrow keys move the highlight across the
series' points, `Escape` clears the highlight and the zoom. State is
announced via an ARIA live region.
