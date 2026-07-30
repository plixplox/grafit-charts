import type { ChartOptions } from 'grafit-charts';

/**
 * Превью для билдера тем. Живут в доках, а не в examples/ — иначе
 * test/image/examples.test.ts завёл бы на каждое по скриншот-бейзлайну.
 *
 * Данные заморожены на уровне модуля: chart.update() запускает 450-миллисекундную
 * интерполяцию, если массив данных сменился при той же длине, а билдер
 * перерисовывает графики на каждое движение слайдера.
 */

const MONTHS = [
  { month: 'Jan', revenue: 42, target: 30, forecast: 38 },
  { month: 'Feb', revenue: 49, target: 34, forecast: 44 },
  { month: 'Mar', revenue: 46, target: 41, forecast: 50 },
  { month: 'Apr', revenue: 58, target: 47, forecast: 55 },
  { month: 'May', revenue: 63, target: 55, forecast: 61 },
  { month: 'Jun', revenue: 60, target: 62, forecast: 66 },
];

const CHANNELS = [
  { channel: 'Direct', desktop: 38, mobile: 27, tablet: 12 },
  { channel: 'Search', desktop: 52, mobile: 44, tablet: 18 },
  { channel: 'Social', desktop: 24, mobile: 51, tablet: 9 },
  { channel: 'Email', desktop: 31, mobile: 22, tablet: 7 },
];

const BROWSERS = [
  { browser: 'Chrome', share: 63 },
  { browser: 'Safari', share: 19 },
  { browser: 'Firefox', share: 9 },
  { browser: 'Edge', share: 6 },
  { browser: 'Other', share: 3 },
];

const SAMPLES = [
  { weight: 12, height: 41, group: 'A' },
  { weight: 26, height: 55, group: 'A' },
  { weight: 34, height: 38, group: 'A' },
  { weight: 47, height: 66, group: 'A' },
  { weight: 58, height: 52, group: 'A' },
  { weight: 71, height: 74, group: 'A' },
  { weight: 18, height: 22, group: 'B' },
  { weight: 33, height: 31, group: 'B' },
  { weight: 45, height: 24, group: 'B' },
  { weight: 62, height: 44, group: 'B' },
  { weight: 76, height: 36, group: 'B' },
];

const ACTIVITY = [
  { day: 'Mon', slot: '09', load: 12 },
  { day: 'Mon', slot: '13', load: 38 },
  { day: 'Mon', slot: '17', load: 24 },
  { day: 'Tue', slot: '09', load: 26 },
  { day: 'Tue', slot: '13', load: 61 },
  { day: 'Tue', slot: '17', load: 33 },
  { day: 'Wed', slot: '09', load: 18 },
  { day: 'Wed', slot: '13', load: 52 },
  { day: 'Wed', slot: '17', load: 47 },
  { day: 'Thu', slot: '09', load: 31 },
  { day: 'Thu', slot: '13', load: 44 },
  { day: 'Thu', slot: '17', load: 72 },
];

const CANDLES = [
  { day: '01', open: 44, high: 52, low: 42, close: 50 },
  { day: '02', open: 50, high: 55, low: 47, close: 48 },
  { day: '03', open: 48, high: 51, low: 40, close: 42 },
  { day: '04', open: 42, high: 49, low: 41, close: 47 },
  { day: '05', open: 47, high: 58, low: 46, close: 57 },
  { day: '06', open: 57, high: 59, low: 51, close: 53 },
  { day: '07', open: 53, high: 62, low: 52, close: 61 },
];

const SKILLS = [
  { axis: 'Speed', now: 82, before: 61 },
  { axis: 'Quality', now: 74, before: 68 },
  { axis: 'Cost', now: 55, before: 72 },
  { axis: 'Support', now: 88, before: 70 },
  { axis: 'Docs', now: 69, before: 44 },
];

export interface PreviewDefinition {
  id: string;
  /** Подпись над превью — объясняет, какие токены на нём видно. */
  title: string;
  hint: string;
  create(): ChartOptions;
}

export const PREVIEWS: PreviewDefinition[] = [
  {
    id: 'lines',
    title: 'Line and area',
    hint: 'palette · line width · fill opacity · axes · captions',
    create: () => ({
      data: MONTHS,
      title: { text: 'Revenue' },
      subtitle: { text: 'against plan, thousands' },
      series: [
        { type: 'area', xField: 'month', yField: 'target', name: 'Plan' },
        { type: 'line', xField: 'month', yField: 'revenue', name: 'Actual', marker: { enabled: true } },
      ],
      crosshair: { snap: true },
    }),
  },
  {
    id: 'bars',
    title: 'Grouped bars',
    hint: 'fills · corner radius · category axis · legend',
    create: () => ({
      data: CHANNELS,
      series: [
        { type: 'bar', xField: 'channel', yField: 'desktop', name: 'Desktop' },
        { type: 'bar', xField: 'channel', yField: 'mobile', name: 'Mobile' },
        { type: 'bar', xField: 'channel', yField: 'tablet', name: 'Tablet' },
      ],
      legend: { position: 'bottom' },
    }),
  },
  {
    id: 'donut',
    title: 'Donut',
    hint: 'palette cycling · callout labels · base font size',
    create: () => ({
      data: BROWSERS,
      series: [{ type: 'donut', angleField: 'share', labelField: 'browser' }],
      legend: { enabled: false },
    }),
  },
  {
    id: 'scatter',
    title: 'Scatter',
    hint: 'markers · fill opacity · grid on both axes',
    create: () => ({
      data: SAMPLES,
      series: [{ type: 'scatter', xField: 'weight', yField: 'height', name: 'Samples', size: 10 }],
      legend: { enabled: false },
    }),
  },
  {
    id: 'heatmap',
    title: 'Heatmap',
    hint: 'sequential ramp · gradient legend · cell radius',
    create: () => ({
      data: ACTIVITY,
      series: [{ type: 'heatmap', xField: 'day', yField: 'slot', colorField: 'load', name: 'Load' }],
      gradientLegend: { enabled: true },
      legend: { enabled: false },
    }),
  },
  {
    id: 'candles',
    title: 'Candlestick',
    hint: 'positive and negative colours',
    create: () => ({
      data: CANDLES,
      series: [
        {
          type: 'candlestick',
          xField: 'day',
          openField: 'open',
          highField: 'high',
          lowField: 'low',
          closeField: 'close',
          name: 'Price',
        },
      ],
      legend: { enabled: false },
    }),
  },
  {
    id: 'radar',
    title: 'Radar',
    hint: 'polar web · fill opacity · rim labels',
    create: () => ({
      data: SKILLS,
      series: [
        { type: 'radar-area', angleField: 'axis', radiusField: 'before', name: 'Before' },
        { type: 'radar-area', angleField: 'axis', radiusField: 'now', name: 'Now' },
      ],
      legend: { position: 'bottom' },
    }),
  },
];
