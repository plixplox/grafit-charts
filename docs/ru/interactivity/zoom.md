# Zoom и Navigator

## Zoom

`zoom: { enabled: true }` включает зум колесом вокруг курсора, панорамирование
перетаскиванием и сброс двойным кликом. Правый клик (при `contextMenu`) — меню
со скачиванием PNG и сбросом зума.

::: chart-example zoom-basic

## Navigator

Полоса под областью построения с окном видимого диапазона и ручками:

::: tip Модульная сборка
Zoom входит в ядро, а navigator в сборке через [grafit-charts/core](/ru/guide/bundle) — отдельный модуль: `register(navigatorModule)`.
:::

::: chart-example navigator-basic

| Опция                           | Тип                                    | По умолчанию | Описание                                    |
| ------------------------------- | -------------------------------------- | ------------ | ------------------------------------------- |
| `enabled`                       | `boolean`                              | `false`      | включить навигатор                          |
| `sync.groupId`                  | `string`                               | общая группа | группа синхронизации чартов                 |
| `sync.nodeInteraction`          | `boolean`                              | `true`       | синхронизация подсветки узлов               |
| `zoom.axes`                     | `'x' \| 'y' \| 'xy'`                   | `'x'`        | зумируемые оси                              |
| `zoom.wheelZoom`          | `boolean`                              | `true`       | зум колесом                                 |
| `zoom.wheelStep`            | `number`                               | `0.1`        | шаг зума за тик колеса                      |
| `zoom.dragPan`            | `boolean`                              | `true`       | панорамирование перетаскиванием             |
| `zoom.panKey`                   | `'alt' \| 'ctrl' \| 'shift' \| 'meta'` | —            | модификатор пана (без него drag — box-zoom) |
| `zoom.dragSelect`          | `boolean`                              | `false`      | выделение области → зум                     |
| `zoom.doubleClickReset` | `boolean`                              | `true`       | сброс двойным кликом                        |
| `zoom.minRatio`                 | `number`                               | `0.05`       | минимальная ширина окна (доля домена)       |
| `navigator.height`              | `Pixels`                            | `24`         | высота полосы навигатора                    |
| `navigator.miniChart.enabled`   | `boolean`                              | `true`       | миниатюра серии в полосе                    |
| `navigator.min`                 | `0..1`                                 | `0`          | начало окна                                 |
| `navigator.max`                 | `0..1`                                 | `1`          | конец окна                                  |

Pinch-жест на тач-устройствах зумирует вокруг центра жеста. Окно навигатора и зум — одно состояние: колесо обновляет навигатор и наоборот.
Текущее окно сохраняется в [состоянии чарта](/ru/interactivity/state).
