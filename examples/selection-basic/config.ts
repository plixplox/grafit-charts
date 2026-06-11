import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Data selection' },
    subtitle: { text: 'box select or click; mode: multiple — selection accumulates' },
    series: [{ type: 'scatter', xField: 'effort', yField: 'impact', name: 'Tasks' }],
    selection: {
      enabled: true,
      mode: 'multiple',
      itemStyle: { stroke: '#e5484d', strokeWidth: 2.5, sizeRatio: 1.6 },
      inactiveOpacity: 0.3,
    },
    listeners: {
      selectionChange: ({ items }) => console.log('selected:', items.length),
    },
    legend: { enabled: false },
  };
}
