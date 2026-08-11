/**
 * The single place that lists every concrete module of the library.
 * Imported only by the full grafit entry point — the grafit/core entry point
 * does not pull this file in, so unregistered modules are dropped by tree-shaking.
 */
import { defaultRegistry } from '@/app/registry';
import { categoryAxisModule } from '@/entities/axis/category';
import { groupedCategoryAxisModule } from '@/entities/axis/grouped-category';
import { logAxisModule } from '@/entities/axis/log';
import { numberAxisModule } from '@/entities/axis/number';
import { ordinalTimeAxisModule } from '@/entities/axis/ordinal-time';
import { timeAxisModule } from '@/entities/axis/time';
import { gradientLegendModule } from '@/entities/gradient-legend';
import { legendModule } from '@/entities/legend';
import { areaSeriesModule } from '@/entities/series/area';
import { barSeriesModule } from '@/entities/series/bar';
import { boxPlotSeriesModule } from '@/entities/series/box-plot';
import { bubbleSeriesModule } from '@/entities/series/bubble';
import { candlestickSeriesModule } from '@/entities/series/candlestick';
import { chordSeriesModule } from '@/entities/series/chord';
import { coneFunnelSeriesModule } from '@/entities/series/cone-funnel';
import { donutSeriesModule } from '@/entities/series/donut';
import { funnelSeriesModule } from '@/entities/series/funnel';
import { heatmapSeriesModule } from '@/entities/series/heatmap';
import { histogramSeriesModule } from '@/entities/series/histogram';
import { lineSeriesModule } from '@/entities/series/line';
import { linearGaugeSeriesModule } from '@/entities/series/linear-gauge';
import { nightingaleSeriesModule } from '@/entities/series/nightingale';
import { ohlcSeriesModule } from '@/entities/series/ohlc';
import { pieSeriesModule } from '@/entities/series/pie';
import { pyramidSeriesModule } from '@/entities/series/pyramid';
import { radarAreaSeriesModule } from '@/entities/series/radar-area';
import { radarLineSeriesModule } from '@/entities/series/radar-line';
import { radialBarSeriesModule } from '@/entities/series/radial-bar';
import { radialColumnSeriesModule } from '@/entities/series/radial-column';
import { radialGaugeSeriesModule } from '@/entities/series/radial-gauge';
import { rangeAreaSeriesModule } from '@/entities/series/range-area';
import { rangeBarSeriesModule } from '@/entities/series/range-bar';
import { sankeySeriesModule } from '@/entities/series/sankey';
import { scatterSeriesModule } from '@/entities/series/scatter';
import { sunburstSeriesModule } from '@/entities/series/sunburst';
import { treemapSeriesModule } from '@/entities/series/treemap';
import { waterfallSeriesModule } from '@/entities/series/waterfall';
import { annotationsModule } from '@/features/annotations';
import { contextMenuModule } from '@/features/context-menu';
import { crosshairModule } from '@/features/crosshair';
import { navigatorModule } from '@/features/navigator';
import { syncModule } from '@/features/sync';
import { tooltipModule } from '@/features/tooltip';
import type { ModuleRegistry, ChartModule } from '@/shared/kernel';
import { cartesianChartModule } from '@/widgets/cartesian-chart';
import { standaloneChartModule } from '@/widgets/hierarchy-chart';
import { polarChartModule } from '@/widgets/polar-chart';

let registered = false;

export function registerDefaultModules(registry: ModuleRegistry = defaultRegistry): void {
  if (registry === defaultRegistry && registered) return;
  registered = registry === defaultRegistry;
  registry.register(
    lineSeriesModule as ChartModule,
    barSeriesModule as ChartModule,
    areaSeriesModule as ChartModule,
    scatterSeriesModule as ChartModule,
    bubbleSeriesModule as ChartModule,
    histogramSeriesModule as ChartModule,
    pieSeriesModule as ChartModule,
    donutSeriesModule as ChartModule,
    radarLineSeriesModule as ChartModule,
    radarAreaSeriesModule as ChartModule,
    nightingaleSeriesModule as ChartModule,
    radialColumnSeriesModule as ChartModule,
    radialBarSeriesModule as ChartModule,
    heatmapSeriesModule as ChartModule,
    rangeBarSeriesModule as ChartModule,
    rangeAreaSeriesModule as ChartModule,
    boxPlotSeriesModule as ChartModule,
    waterfallSeriesModule as ChartModule,
    funnelSeriesModule as ChartModule,
    coneFunnelSeriesModule as ChartModule,
    candlestickSeriesModule as ChartModule,
    ohlcSeriesModule as ChartModule,
    treemapSeriesModule as ChartModule,
    sunburstSeriesModule as ChartModule,
    pyramidSeriesModule as ChartModule,
    sankeySeriesModule as ChartModule,
    chordSeriesModule as ChartModule,
    radialGaugeSeriesModule as ChartModule,
    linearGaugeSeriesModule as ChartModule,
    numberAxisModule as ChartModule,
    ordinalTimeAxisModule as ChartModule,
    groupedCategoryAxisModule as ChartModule,
    categoryAxisModule as ChartModule,
    timeAxisModule as ChartModule,
    logAxisModule as ChartModule,
    cartesianChartModule,
    polarChartModule,
    standaloneChartModule,
    legendModule,
    gradientLegendModule,
    tooltipModule,
    crosshairModule,
    navigatorModule,
    annotationsModule,
    syncModule,
    contextMenuModule,
  );
}
