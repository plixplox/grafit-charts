import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'GDP vs Happiness Index' },
    subtitle: { text: 'bubble size — population, millions' },
    series: [
      {
        type: 'bubble',
        xField: 'gdp',
        xName: 'GDP per capita',
        yField: 'happiness',
        name: 'Happiness Index',
        sizeField: 'population',
        sizeName: 'Population, M',
        maxSize: 36,
      },
    ],
    axes: [
      { type: 'number', position: 'bottom', title: { text: 'GDP per capita, $K' } },
      { type: 'number', position: 'left', title: { text: 'Happiness Index' }, nice: false },
    ],
    legend: { enabled: false },
  };
}
