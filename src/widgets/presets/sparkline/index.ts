import type { Datum } from '@/shared/options';

/** Simplified sparkline options: a miniature chart with no chrome. */
export interface SparklineOptions {
  container?: HTMLElement;
  data?: Datum[];
  type?: 'line' | 'area' | 'bar';
  /** Value field; categories are the data indices. */
  field: string;
  stroke?: string;
  fill?: string;
  theme?: unknown;
  width?: number;
  height?: number;
}

const bareAxis = {
  label: { enabled: false },
  line: { enabled: false },
  tick: { enabled: false },
  gridLine: { enabled: false },
};

export function buildSparklineOptions(options: SparklineOptions): Record<string, unknown> {
  const { container, data = [], type = 'line', field, stroke, fill, theme, width, height } = options;
  const indexed = data.map((datum, index) => ({ ...datum, __index: index }));
  const series =
    type === 'bar'
      ? { type: 'bar', xField: '__index', yField: field, fill }
      : type === 'area'
        ? { type: 'area', xField: '__index', yField: field, fill, stroke, marker: { enabled: false } }
        : { type: 'line', xField: '__index', yField: field, stroke, marker: { enabled: false } };
  return {
    container,
    data: indexed,
    theme,
    width,
    height,
    series: [series],
    // line/area — numeric X axis: points span edge to edge, no band padding;
    // bar — categorical with zero outer padding
    axes: [
      type === 'bar'
        ? { type: 'category', position: 'bottom', paddingOuter: 0, paddingInner: 0.15, ...bareAxis }
        : { type: 'number', position: 'bottom', nice: false, ...bareAxis },
      { type: 'number', position: 'left', ...bareAxis },
    ],
    legend: { enabled: false },
    padding: { top: 2, right: 2, bottom: 2, left: 2 },
    animation: { enabled: false },
  };
}
