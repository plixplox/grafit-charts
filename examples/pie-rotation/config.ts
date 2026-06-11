import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Rotation and sector labels' },
    subtitle: { text: 'rotation: -90, sectorLabel + custom colors' },
    series: [
      {
        type: 'pie',
        angleField: 'amount',
        angleName: 'Share, %',
        labelField: 'source',
        rotation: -90,
        fills: ['#1d4fd7', '#27c08d', '#f4a236', '#9a7bff'],
        sectorLabel: { enabled: true },
        calloutLabel: { enabled: false },
      },
    ],
    legend: { position: 'right' },
  };
}
