# Sparklines

Миниатюрные чарты без осей и хрома — для таблиц и карточек:

Line:

::: chart-example sparkline-line

Area:

::: chart-example sparkline-area

Bar:

::: chart-example sparkline-bar

## Пресет

```ts
Charts.createSparkline({
  container,
  data, // [{ value: 12 }, ...]
  field: 'value',
  type: 'area', // 'line' | 'area' | 'bar'
  height: 40,
});
```

Пресет строит обычные options: серия + «голые» оси + минимальный padding —
то же самое можно собрать вручную (см. вкладку config.ts выше).

## Опции

| Опция       | Тип                         | По умолчанию  | Описание                                                |
| ----------- | --------------------------- | ------------- | ------------------------------------------------------- |
| `type`      | `'line' \| 'area' \| 'bar'` | `'line'`      | вид спарклайна                                          |
| `container` | данные                      | —             | контейнер, данные и поле значения (категории — индексы) |
| `data`      | данные                      | —             | контейнер, данные и поле значения (категории — индексы) |
| `field`     | данные                      | —             | контейнер, данные и поле значения (категории — индексы) |
| `fill`      | `ColorValue`                  | палитра       | цвета                                                   |
| `stroke`    | `ColorValue`                  | палитра       | цвета                                                   |
| `width`     | `Pixels`                 | по контейнеру | размеры                                                 |
| `height`    | `Pixels`                 | по контейнеру | размеры                                                 |
| `theme`     | `ThemeName \| ThemeOptions` | `default`     | тема                                                    |
