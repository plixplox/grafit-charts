/** Localization of the library's built-in strings. */
export type LocaleKey = 'loading' | 'noData' | 'downloadPng' | 'resetZoom';

export interface LocaleOptions {
  localeText?: Partial<Record<LocaleKey, string>>;
}

export const DEFAULT_LOCALE: Record<LocaleKey, string> = {
  loading: 'Loading data…',
  noData: 'No data to display',
  downloadPng: 'Download PNG',
  resetZoom: 'Reset zoom',
};

export function localize(options: LocaleOptions | undefined, key: LocaleKey): string {
  return options?.localeText?.[key] ?? DEFAULT_LOCALE[key];
}
