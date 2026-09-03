import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Deliveries by destination' },
    subtitle: { text: 'thousand parcels, every city name kept on the axis' },
    series: [{ type: 'bar', xField: 'destination', yField: 'parcels', name: 'Parcels', cornerRadius: 2 }],
    axes: [
      {
        type: 'category',
        position: 'bottom',
        // tilted names clear each other by a line of text rather than by their length,
        // so eight of them fit where four would level out the axis
        label: { rotation: -45 },
      },
      { type: 'number', position: 'left' },
    ],
    legend: { enabled: false },
  };
}
