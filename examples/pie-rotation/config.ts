import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Rotation and sector labels' },
    subtitle: { text: 'rotation: -90, labels inside the sectors' },
    series: [
      {
        type: 'pie',
        angleField: 'amount',
        angleName: 'Share, %',
        labelField: 'source',
        rotation: -90,
        fills: ['#1d4fd7', '#27c08d', '#f4a236', '#9a7bff'],
        // the whole label sits in the sector: the name above, the share under it
        label: {
          placement: 'inside',
          category: { fontWeight: 'bold' },
          value: { enabled: true },
        },
      },
    ],
    legend: { position: 'right' },
  };
}
