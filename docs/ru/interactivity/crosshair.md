# Crosshair

Перекрестие с подписями значений на осях. По умолчанию привязывается к ближайшему узлу
(`snap`), вместе с тултипом и подсветкой.

::: tip Модульная сборка
В сборке через [grafit-charts/core](/ru/guide/bundle) crosshair — отдельный модуль: `register(crosshairModule)`.
:::

::: chart-example crosshair-basic

| Опция           | Тип           | По умолчанию | Описание                               |
| --------------- | ------------- | ------------ | -------------------------------------- |
| `enabled`       | `boolean`     | —            | включить (блок присутствует → включён) |
| `snap`          | `boolean`     | `true`       | привязка к ближайшему узлу             |
| `stroke`        | `ColorValue`    | muted темы   | цвет линий                             |
| `strokeWidth`   | `Pixels`   | `1`          | толщина                                |
| `lineDash`      | `Pixels[]` | `[4, 3]`     | пунктир                                |
| `label.enabled` | `boolean`     | `true`       | плашки значений у осей                 |
