import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'City Population' },
    subtitle: { text: 'million people' },
    series: [{ type: 'bar', xField: 'city', yField: 'population', name: 'Population', cornerRadius: 4 }],
    legend: { enabled: false },
  };
}
