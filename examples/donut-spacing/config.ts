import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

const money = new Intl.NumberFormat('en-US');

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Sector spacing and corner radius' },
    series: [
      {
        type: 'donut',
        angleField: 'amount',
        labelField: 'fund',
        innerRadiusRatio: 0.55,
        sectorSpacing: 6,
        cornerRadius: 8,
        label: { placement: 'outside' },
        calloutLine: {
          radial: { length: 12, strokeWidth: 1 },
          horizontal: { length: 16, stroke: '#9aa1ad', strokeWidth: 1 },
        },
        tooltip: {
          renderer: ({ label, value, color }) => ({
            heading: label,
            rows: [{ label: 'Amount', value: money.format(Number(value)), color }],
          }),
        },
      },
    ],
    legend: { enabled: false },
  };
}
