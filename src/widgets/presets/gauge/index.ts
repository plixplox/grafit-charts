import type { LinearGaugeSeriesOptions } from '@/entities/series/linear-gauge';
import type { RadialGaugeSeriesOptions } from '@/entities/series/radial-gauge';

export type GaugeOptions = (Omit<RadialGaugeSeriesOptions, 'type'> | Omit<LinearGaugeSeriesOptions, 'type'>) & {
  container?: HTMLElement;
  type?: 'radial-gauge' | 'linear-gauge';
  title?: string;
  theme?: unknown;
  width?: number;
  height?: number;
};

export function buildGaugeOptions(options: GaugeOptions): Record<string, unknown> {
  const { container, type = 'radial-gauge', title, theme, width, height, ...series } = options;
  return {
    container,
    theme,
    width,
    height,
    title: title ? { text: title } : undefined,
    series: [{ ...series, type }],
    legend: { enabled: false },
  };
}
