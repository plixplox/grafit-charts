import { getData } from './data';
import type { ChartOptions } from 'grafit-charts';

export function createOptions(): ChartOptions {
  return {
    data: getData(),
    title: { text: 'Chart events' },
    subtitle: { text: 'clicks, selection, wheel zoom, legend — events in the DevTools console' },
    series: [
      {
        type: 'bar',
        xField: 'feature',
        yField: 'usage',
        name: 'Usage, %',
      },
    ],
    selection: { enabled: true, mode: 'multiple' },
    zoom: { enabled: true },
    listeners: {
      nodeClick: ({ seriesId, datumIndex, datum }) => {
        console.log('nodeClick:', seriesId, datumIndex, datum);
      },
      selectionChange: ({ items }) => {
        console.log(
          'selectionChange:',
          // datum is there for a series that counts data rows; a histogram bin reports `node`
          items.map((item) => item.datum?.feature ?? item.node),
        );
      },
      zoomChange: ({ x }) => {
        console.log('zoomChange:', x.map((value) => value.toFixed(2)).join(' – '));
      },
      legendItemClick: ({ seriesId, visible }) => {
        console.log('legendItemClick:', seriesId, visible);
      },
    },
  };
}
