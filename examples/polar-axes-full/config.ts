import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

/** Every polar axis option on a rose, each one set away from its default. */
export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Every axis option — rose' },
    series: [{ type: 'nightingale', angleField: 'month', radiusField: 'incidents', name: 'Incidents', fillOpacity: 0.55 }],
    legend: { enabled: false },
    axes: {
      angle: {
        // the spokes
        gridLine: { enabled: true, stroke: '#0ea5e9', width: 1, lineDash: [1, 3], opacity: 0.7 },
        // the rim around the web
        line: { enabled: true, stroke: '#0f172a', width: 2, lineDash: [8, 3] },
        // the category names
        label: {
          enabled: true,
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 'bold',
          color: '#0f172a',
          formatter: ({ value }) => String(value).toUpperCase(),
        },
        title: { enabled: true, text: 'Month', fontSize: 14, fontFamily: 'system-ui, sans-serif', fontWeight: 'normal', color: '#0ea5e9' },
      },
      radius: {
        // bounds of the value scale, taken from the options rather than the data
        min: 0,
        max: 45,
        nice: false,
        ringCount: 3,
        // the rings
        gridLine: { enabled: true, stroke: '#f43f5e', width: 1, lineDash: [], opacity: 0.25 },
        // the vertical the ring values are read along
        line: { enabled: true, stroke: '#f43f5e', width: 2, lineDash: [4, 2] },
        // the ring values
        label: {
          enabled: true,
          fontSize: 11,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 'bold',
          color: '#f43f5e',
          format: ',.0f',
        },
        title: {
          enabled: true,
          text: 'Incidents',
          fontSize: 14,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 'normal',
          color: '#f43f5e',
        },
      },
    },
  };
}
