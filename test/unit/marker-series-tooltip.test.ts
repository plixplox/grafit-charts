import { BubbleSeries } from '@/entities/series/bubble';
import { ScatterSeries } from '@/entities/series/scatter';
import type { CartesianRenderContext, SeriesEnv } from '@/shared/kernel';
import { LinearScale } from '@/shared/scale';
import { Group } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const env: SeriesEnv = {
  id: 'series-0',
  colors: { fill: '#3b82f6', stroke: '#1d4ed8' },
  theme: {
    backgroundColor: '#fff',
    foregroundColor: '#111',
    mutedColor: '#888',
    axisColor: '#ddd',
    fontFamily: 'sans-serif',
    fontSize: 11,
    strokeWidth: 2,
    positiveColor: '#21a06c',
    negativeColor: '#e5484d',
    palette: { fills: ['#3b82f6'], strokes: ['#1d4ed8'], sequential: ['#dbe6ff', '#1d4fd7'] },
    axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
  },
};

const data = [
  { country: 'India', gdp: 12.6, happiness: 6.1, population: 1412 },
  { country: 'USA', gdp: 76, happiness: 6.9, population: 332 },
];

function renderContext(): CartesianRenderContext {
  return {
    data,
    measureText: (text: string) => text.length * 10,
    xScale: new LinearScale([0, 80], [0, 400]),
    yScale: new LinearScale([0, 8], [300, 0]),
    swapped: false,
    plot: { x: 0, y: 0, width: 400, height: 300 },
    layer: new Group(),
  };
}

describe('marker series tooltip', () => {
  it('identifies the series in the heading and labels both axes as rows', () => {
    const series = new ScatterSeries(
      { type: 'scatter', xField: 'gdp', xName: 'GDP per capita', yField: 'happiness', name: 'Happiness Index' },
      env,
    );
    series.update(renderContext());
    expect(series.tooltipFor(0)).toEqual({
      heading: { text: 'Happiness Index', color: '#3b82f6' },
      rows: [
        { label: 'GDP per capita', value: '12.6' },
        { label: 'happiness', value: '6.1' },
      ],
    });
  });

  it('labels the y row with yName and appends the bubble size row with its share', () => {
    const series = new BubbleSeries(
      {
        type: 'bubble',
        xField: 'gdp',
        yField: 'happiness',
        yName: 'Happiness',
        name: 'Countries',
        sizeField: 'population',
        sizeName: 'Population, M',
      },
      env,
    );
    series.update(renderContext());
    expect(series.tooltipFor(0)).toEqual({
      heading: { text: 'Countries', color: '#3b82f6' },
      rows: [
        { label: 'gdp', value: '12.6' },
        { label: 'Happiness', value: '6.1' },
        // 1412 of 1412 + 332
        { label: 'Population, M', value: '1412 (81%)' },
      ],
    });
  });

  it('heads the tooltip with the point name once labelField gives it one', () => {
    const series = new ScatterSeries(
      { type: 'scatter', xField: 'gdp', yField: 'happiness', labelField: 'country', name: 'Countries' },
      env,
    );
    series.update(renderContext());
    expect(series.tooltipFor(0)).toEqual({
      heading: { text: 'India', color: '#3b82f6' },
      rows: [
        { label: 'gdp', value: '12.6' },
        { label: 'happiness', value: '6.1' },
      ],
    });
  });

  it('spells the point name out with labelName, in the heading and in the label alike', () => {
    const series = new ScatterSeries(
      {
        type: 'scatter',
        xField: 'gdp',
        yField: 'happiness',
        labelField: 'country',
        labelName: { formatter: ({ value }) => String(value).toUpperCase() },
      },
      env,
    );
    series.update(renderContext());
    expect(series.tooltipFor(0).heading).toEqual({ text: 'INDIA', color: '#3b82f6' });
  });

  it('keeps row markers in shared mode so combined rows stay distinguishable', () => {
    const series = new ScatterSeries({ type: 'scatter', xField: 'gdp', yField: 'happiness' }, env);
    series.update(renderContext());
    expect(series.tooltipFor(0, 'shared')).toEqual({
      heading: '12.6',
      rows: [{ label: 'happiness', value: '6.1', color: '#3b82f6' }],
    });
  });

  it('does not touch content produced by a custom renderer', () => {
    const series = new ScatterSeries(
      {
        type: 'scatter',
        xField: 'gdp',
        yField: 'happiness',
        tooltip: { renderer: () => ({ heading: 'custom', rows: [{ label: 'a', value: '1', color: '#000' }] }) },
      },
      env,
    );
    series.update(renderContext());
    expect(series.tooltipFor(0)).toEqual({
      heading: 'custom',
      rows: [{ label: 'a', value: '1', color: '#000' }],
    });
  });
});
