import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'User migration between platforms' },
    subtitle: { text: 'nodeSpacing: 28, dense ribbons, labels with totals' },
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
          formatter: ({ name, total }) => `${name} (${total})`,
        },
      },
    ],
    legend: { enabled: false },
  };
}
