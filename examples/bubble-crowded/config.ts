import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'GDP vs Happiness Index' },
    subtitle: { text: 'labels go to the bubbles worth naming, biggest first' },
    series: [
      {
        type: 'bubble',
        xField: 'gdp',
        xName: 'GDP per capita',
        yField: 'happiness',
        yName: 'Happiness',
        labelField: 'country',
        name: 'Countries',
        sizeField: 'population',
        sizeName: 'Population, M',
        maxSize: 36,
        label: {
          enabled: true,
          minShare: 0.04,
          avoidOverlap: true,
          category: { fontWeight: 'bold' },
          value: { type: 'percent', color: '#8a8f98' },
        },
      },
    ],
    axes: [
      { type: 'number', position: 'bottom', title: { text: 'GDP per capita, $K' } },
      { type: 'number', position: 'left', title: { text: 'Happiness Index' } },
    ],
    legend: { enabled: false },
  };
}
