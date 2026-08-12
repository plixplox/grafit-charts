import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'User migration between platforms' },
    subtitle: { text: 'nodeSpacing: 28, dense ribbons, a share under every name' },
    series: [
      {
        type: 'chord',
        fromField: 'from',
        toField: 'to',
        sizeField: 'users',
        nodeSpacing: 28,
        linkOpacity: 0.55,
        label: {
          fontSize: 12,
          // the value half reads as a share of the ring, on a line of its own
          value: { enabled: true, type: 'percent', fontSize: 10, color: '#8892a4' },
        },
      },
    ],
    legend: { enabled: false },
  };
}
