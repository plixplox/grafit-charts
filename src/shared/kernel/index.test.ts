import { ModuleRegistry, type AxisModule, type ChartWidgetModule, type FeatureModule, type SeriesModule } from './index';
import { describe, expect, it } from 'vitest';

const seriesModule = { kind: 'series', type: 'line', chartKind: 'cartesian', create: () => ({}) } as unknown as SeriesModule;
const axisModule = { kind: 'axis', type: 'number', create: () => ({}) } as unknown as AxisModule;
const chartModule = {
  kind: 'chart',
  chartKinds: ['hierarchy', 'flow'],
  create: () => ({}),
} as unknown as ChartWidgetModule;
const featureModule: FeatureModule<{ greet(): string }> = {
  kind: 'feature',
  name: 'tooltip',
  api: { greet: () => 'hi' },
};

describe('ModuleRegistry', () => {
  it('buckets modules by kind and returns them back', () => {
    const registry = new ModuleRegistry();
    registry.register(seriesModule, axisModule, chartModule, featureModule);
    expect(registry.getSeries('line')).toBe(seriesModule);
    expect(registry.getAxis('number')).toBe(axisModule);
    expect(registry.getFeature<{ greet(): string }>('tooltip')?.greet()).toBe('hi');
  });

  it('registers a chart widget for each of its chartKinds', () => {
    const registry = new ModuleRegistry();
    registry.register(chartModule);
    expect(registry.getChart('hierarchy')).toBe(chartModule);
    expect(registry.getChart('flow')).toBe(chartModule);
    expect(registry.getChart('cartesian')).toBeUndefined();
  });

  it('returns undefined for unregistered modules', () => {
    const registry = new ModuleRegistry();
    expect(registry.getSeries('line')).toBeUndefined();
    expect(registry.getFeature('tooltip')).toBeUndefined();
  });
});
