/**
 * Localization of the library's built-in strings. Everything the library
 * prints without being handed the text — the overlays, the toolbar, and the
 * labels a tooltip puts beside a value it took apart itself — reads from here,
 * so a chart speaks one language wherever the words came from.
 */
export type LocaleKey =
  | 'loading'
  | 'noData'
  /** Nothing could be drawn: the reason itself goes to the console. */
  | 'renderError'
  /** Histogram: what a quarter bin is called, before its number. */
  | 'quarter'
  | 'downloadPng'
  | 'resetZoom'
  /** Waterfall: the subtotal bar, and the running total beside a step. */
  | 'waterfallTotal'
  | 'waterfallCumulative'
  /** Box plot: the five numbers of a box, top to bottom. */
  | 'boxPlotMax'
  | 'boxPlotQ3'
  | 'boxPlotMedian'
  | 'boxPlotQ1'
  | 'boxPlotMin'
  /** Candlestick and OHLC: the four prices of a session. */
  | 'ohlcOpen'
  | 'ohlcHigh'
  | 'ohlcLow'
  | 'ohlcClose';

export interface LocaleOptions {
  localeText?: Partial<Record<LocaleKey, string>>;
}

export const DEFAULT_LOCALE: Record<LocaleKey, string> = {
  loading: 'Loading data…',
  noData: 'No data to display',
  renderError: 'The chart could not be drawn',
  quarter: 'Q',
  downloadPng: 'Download PNG',
  resetZoom: 'Reset zoom',
  waterfallTotal: 'Total',
  waterfallCumulative: 'Cumulative',
  boxPlotMax: 'max',
  boxPlotQ3: 'q3',
  boxPlotMedian: 'median',
  boxPlotQ1: 'q1',
  boxPlotMin: 'min',
  ohlcOpen: 'O',
  ohlcHigh: 'H',
  ohlcLow: 'L',
  ohlcClose: 'C',
};

export function localize(options: LocaleOptions | undefined, key: LocaleKey): string {
  return options?.localeText?.[key] ?? DEFAULT_LOCALE[key];
}
