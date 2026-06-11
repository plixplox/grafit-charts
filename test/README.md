# Тесты

Два vitest-проекта (`vitest.config.ts`):

| Проект | Что | Где | Запуск |
| --- | --- | --- | --- |
| `unit` | чистая логика, node | `src/**/*.test.ts` (колокация), `test/unit/` | `npm test` |
| `image` | скриншоты примеров, Chromium | `test/image/` | `npm run test:image` |

`npm run test:all` — оба проекта.

## Юнит-тесты

Лежат рядом с кодом (`src/shared/scale/linear-scale.test.ts` и т.п.);
из сборки `dist/` исключены через `tsconfig.build.json`. Каталог `test/unit/`
зарезервирован под кросс-слойные тесты, которым колокация не подходит.

## Скриншот-тесты (examples-as-tests)

`test/image/examples.test.ts` собирает все `examples/<name>/` через
`import.meta.glob` — **новый пример автоматически становится тестом**.
Каждый пример монтируется в реальном headless Chromium (vitest browser mode,
`@vitest/browser-playwright`) через публичный `Charts.create` с отключённой
анимацией и сверяется попиксельно (`toMatchScreenshot`, pixelmatch).

- **Эталоны**: `test/image/__screenshots__/<name>.png`, коммитятся в git.
- **Обновление**: `npm run test:image:update` (после — проверить diff глазами).
- **При падении**: reference/actual/diff пишутся в `.vitest-attachments/`
  (не коммитится), пути печатаются в сообщении об ошибке.
- **Пороги**: `threshold: 0.1`, `allowedMismatchedPixelRatio: 0.0005` —
  задаются в `vitest.config.ts`, запас только на дрейф антиалиасинга.
- **Детерминизм**: `TZ=UTC` (подписи временно́й оси), `animation: {enabled: false}`,
  данные примеров без `Math.random`/`Date.now`. Эталоны зависят от шрифтов ОС
  и версии Chromium (закреплена в package-lock) — при смене окружения
  перегенерировать.
