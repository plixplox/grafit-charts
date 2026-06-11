import type { AnnotationOptions } from '@/features/annotations';
import type { Datum } from '@/shared/options';

/**
 * Simplified financial chart options; translated into the full config
 * (candlestick/ohlc + ordinal-time + zoom + navigator + crosshair).
 */
export interface FinancialChartOptions {
  container?: HTMLElement;
  data?: Datum[];
  title?: string;
  chartType?: 'candlestick' | 'ohlc';
  dateField?: string;
  openField?: string;
  highField?: string;
  lowField?: string;
  closeField?: string;
  navigator?: boolean;
  zoom?: boolean;
  annotations?: AnnotationOptions[];
  theme?: unknown;
  width?: number;
  height?: number;
}

/**
 * Returns a full ChartOptions-compatible object. Typed structurally so that
 * widgets does not depend on app (the factory in app/chart-factory casts).
 */
export function buildFinancialChartOptions(options: FinancialChartOptions): Record<string, unknown> {
  const {
    container,
    data,
    title,
    chartType = 'candlestick',
    dateField = 'date',
    openField = 'open',
    highField = 'high',
    lowField = 'low',
    closeField = 'close',
    navigator = true,
    zoom = true,
    annotations,
    theme,
    width,
    height,
  } = options;

  return {
    container,
    data,
    theme,
    width,
    height,
    title: title ? { text: title } : undefined,
    series: [{ type: chartType, xField: dateField, openField, highField, lowField, closeField }],
    axes: [
      { type: 'ordinal-time', position: 'bottom' },
      { type: 'number', position: 'right' },
    ],
    zoom: zoom ? { enabled: true } : undefined,
    navigator: navigator ? { enabled: true } : undefined,
    crosshair: { enabled: true },
    contextMenu: { enabled: true },
    legend: { enabled: false },
    annotations,
  };
}
