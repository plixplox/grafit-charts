/**
 * grafit/modules entry point: all series and axis modules as named exports.
 * Import the ones you need and pass them to register() from 'grafit-charts/core' —
 * tree-shaking drops the rest (sideEffects: false + preserveModules).
 */
// Chart widgets: cartesian — most series; polar — pie/donut/radar/
// nightingale/radial-*; standalone — treemap/sunburst/pyramid/sankey/chord/gauges.
export { cartesianChartModule } from '@/widgets/cartesian-chart';
export { polarChartModule } from '@/widgets/polar-chart';
export { standaloneChartModule } from '@/widgets/hierarchy-chart';

// Optional features (tooltip, legends, navigator, ...).
export { legendModule } from '@/entities/legend';
export { gradientLegendModule } from '@/entities/gradient-legend';
export { tooltipModule } from '@/features/tooltip';
export { crosshairModule } from '@/features/crosshair';
export { navigatorModule } from '@/features/navigator';
export { annotationsModule } from '@/features/annotations';
export { syncModule } from '@/features/sync';
export { contextMenuModule } from '@/features/context-menu';

export { categoryAxisModule } from '@/entities/axis/category';
export { groupedCategoryAxisModule } from '@/entities/axis/grouped-category';
export { logAxisModule } from '@/entities/axis/log';
export { numberAxisModule } from '@/entities/axis/number';
export { ordinalTimeAxisModule } from '@/entities/axis/ordinal-time';
export { timeAxisModule } from '@/entities/axis/time';
export { areaSeriesModule } from '@/entities/series/area';
export { barSeriesModule } from '@/entities/series/bar';
export { boxPlotSeriesModule } from '@/entities/series/box-plot';
export { bubbleSeriesModule } from '@/entities/series/bubble';
export { candlestickSeriesModule } from '@/entities/series/candlestick';
export { chordSeriesModule } from '@/entities/series/chord';
export { coneFunnelSeriesModule } from '@/entities/series/cone-funnel';
export { donutSeriesModule } from '@/entities/series/donut';
export { funnelSeriesModule } from '@/entities/series/funnel';
export { heatmapSeriesModule } from '@/entities/series/heatmap';
export { histogramSeriesModule } from '@/entities/series/histogram';
export { lineSeriesModule } from '@/entities/series/line';
export { linearGaugeSeriesModule } from '@/entities/series/linear-gauge';
export { nightingaleSeriesModule } from '@/entities/series/nightingale';
export { ohlcSeriesModule } from '@/entities/series/ohlc';
export { pieSeriesModule } from '@/entities/series/pie';
export { pyramidSeriesModule } from '@/entities/series/pyramid';
export { radarAreaSeriesModule } from '@/entities/series/radar-area';
export { radarLineSeriesModule } from '@/entities/series/radar-line';
export { radialBarSeriesModule } from '@/entities/series/radial-bar';
export { radialColumnSeriesModule } from '@/entities/series/radial-column';
export { radialGaugeSeriesModule } from '@/entities/series/radial-gauge';
export { rangeAreaSeriesModule } from '@/entities/series/range-area';
export { rangeBarSeriesModule } from '@/entities/series/range-bar';
export { sankeySeriesModule } from '@/entities/series/sankey';
export { scatterSeriesModule } from '@/entities/series/scatter';
export { sunburstSeriesModule } from '@/entities/series/sunburst';
export { treemapSeriesModule } from '@/entities/series/treemap';
export { waterfallSeriesModule } from '@/entities/series/waterfall';
