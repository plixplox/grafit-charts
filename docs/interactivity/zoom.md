# Zoom and Navigator

## Zoom

`zoom: { enabled: true }` enables wheel zoom around the cursor, panning
by dragging, and reset by double click. Right click (with `contextMenu`) opens a menu
with PNG download and zoom reset.

::: chart-example zoom-basic

## Navigator

A strip below the plot area with a window of the visible range and handles:

::: tip Modular build
Zoom is part of the core, while when building with [grafit-charts/core](/guide/bundle) the navigator is a separate module: `register(navigatorModule)`.
:::

::: chart-example navigator-basic

| Option                          | Type                                   | Default       | Description                                      |
| ------------------------------- | -------------------------------------- | ------------- | ------------------------------------------------ |
| `enabled`                       | `boolean`                              | `false`       | enable the navigator                             |
| `sync.groupId`                  | `string`                               | shared group  | chart synchronization group                      |
| `sync.nodeInteraction`          | `boolean`                              | `true`        | synchronization of node highlighting             |
| `zoom.axes`                     | `'x' \| 'y' \| 'xy'`                   | `'x'`         | zoomable axes                                    |
| `zoom.wheelZoom`          | `boolean`                              | `true`        | wheel zoom                                       |
| `zoom.wheelStep`            | `number`                               | `0.1`         | zoom step per wheel tick                         |
| `zoom.dragPan`            | `boolean`                              | `true`        | panning by dragging                              |
| `zoom.panKey`                   | `'alt' \| 'ctrl' \| 'shift' \| 'meta'` | —             | pan modifier (without it, drag is box-zoom)      |
| `zoom.dragSelect`          | `boolean`                              | `false`       | area selection → zoom                            |
| `zoom.doubleClickReset` | `boolean`                              | `true`        | reset by double click                            |
| `zoom.minRatio`                 | `number`                               | `0.05`        | minimum window width (fraction of the domain)    |
| `navigator.height`              | `Pixels`                            | `24`          | navigator strip height                           |
| `navigator.miniChart.enabled`   | `boolean`                              | `true`        | series miniature in the strip                    |
| `navigator.min`                 | `0..1`                                 | `0`           | window start                                     |
| `navigator.max`                 | `0..1`                                 | `1`           | window end                                       |

A pinch gesture on touch devices zooms around the gesture center. The navigator window and zoom are a single state: the wheel updates the navigator and vice versa.
The current window is saved in the [chart state](/interactivity/state).
