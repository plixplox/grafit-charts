import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'reference/**',
      'node_modules/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'test/image/__screenshots__/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // FSD: слои и правила зависимостей (см. docs/dev/03-fsd-structure.md)
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/include': ['src/**/*.ts'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*', capture: ['slice'] },
        { type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'] },
        { type: 'features', pattern: 'src/features/*', capture: ['slice'] },
        { type: 'entities-series', pattern: 'src/entities/series/*', capture: ['slice'] },
        { type: 'entities-axis', pattern: 'src/entities/axis/*', capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
        { type: 'shared', pattern: 'src/shared/*', capture: ['slice'] },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: 'FSD: импорт нарушает иерархию слоёв app → widgets → features → entities → shared (${file.type} → ${dependency.type})',
          rules: [
            // app — композиционный корень: слайсам app разрешены и соседи по слою
            {
              from: { type: 'app' },
              allow: {
                to: {
                  type: ['app', 'widgets', 'features', 'entities', 'entities-series', 'entities-axis', 'shared'],
                },
              },
            },
            {
              from: { type: 'widgets' },
              allow: {
                to: { type: ['features', 'entities', 'entities-series', 'entities-axis', 'shared'] },
              },
            },
            {
              from: { type: 'features' },
              allow: { to: { type: ['entities', 'entities-series', 'entities-axis', 'shared'] } },
            },
            { from: { type: 'entities' }, allow: { to: { type: 'shared' } } },
            // slice-group: серии/оси могут использовать base/ своей группы (аналог @x в FSD 2.1)
            {
              from: { type: 'entities-series' },
              allow: { to: [{ type: 'shared' }, { type: 'entities-series', captured: { slice: 'base' } }] },
            },
            {
              from: { type: 'entities-axis' },
              allow: { to: [{ type: 'shared' }, { type: 'entities-axis', captured: { slice: 'base' } }] },
            },
            { from: { type: 'shared' }, allow: { to: { type: 'shared' } } },
          ],
        },
      ],
    },
  },
);
