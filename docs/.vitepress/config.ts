import { chartExamplePlugin } from './plugins/chart-example';
import type MarkdownIt from 'markdown-it';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

// GitHub Pages project site: https://plixplox.github.io/grafit-charts/
const SITE_BASE = '/grafit-charts/';

/** Карта «имя типа → URL в справочнике» из сгенерированных файлов typedoc. */
function referenceTypeMap(): Map<string, string> {
  const root = fileURLToPath(new URL('../reference', import.meta.url));
  const map = new Map<string, string>();
  for (const dir of ['interfaces', 'type-aliases', 'functions', 'variables']) {
    try {
      for (const file of fs.readdirSync(`${root}/${dir}`)) {
        if (!file.endsWith('.md')) continue;
        const name = file.replace(/\.md$/, '');
        map.set(name, `/reference/${dir}/${name}`);
      }
    } catch {
      // справочник ещё не сгенерирован (docs:api)
    }
  }
  return map;
}

/** Код-спаны с именами типов из справочника становятся ссылками на него. */
function typeAutolinkPlugin(md: MarkdownIt) {
  const types = referenceTypeMap();
  type CodeRule = NonNullable<MarkdownIt['renderer']['rules']['code_inline']>;
  const base: CodeRule = md.renderer.rules.code_inline ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  const rule: CodeRule = (tokens, idx, options, env, self) => {
    const rendered = base(tokens, idx, options, env, self);
    const name = tokens[idx]?.content ?? '';
    const href = types.get(name);
    const path = (env as { relativePath?: string }).relativePath ?? '';
    // внутри самого справочника typedoc уже расставил ссылки
    if (!href || path.startsWith('reference/')) return rendered;
    // сырой <a> минует обработку ссылок VitePress — base добавляем сами
    return `<a href="${SITE_BASE.replace(/\/$/, '')}${href}">${rendered}</a>`;
  };
  md.renderer.rules.code_inline = rule;
}

/** Справочник один (генерируется typedoc) и живёт в корневой (en) локали. */
function referenceSidebar() {
  const root = fileURLToPath(new URL('../reference', import.meta.url));
  const section = (dir: string, title: string) => {
    try {
      const files = fs
        .readdirSync(`${root}/${dir}`)
        .filter((file) => file.endsWith('.md'))
        .map((file) => file.replace(/\.md$/, ''));
      return {
        text: title,
        collapsed: true,
        items: files.map((name) => ({ text: name, link: `/reference/${dir}/${name}` })),
      };
    } catch {
      return { text: title, items: [] };
    }
  };
  return [
    { text: 'Overview', link: '/reference/' },
    section('interfaces', 'Interfaces'),
    section('type-aliases', 'Type aliases'),
    section('functions', 'Functions'),
    section('variables', 'Variables'),
  ];
}

type DocsLocale = 'en' | 'ru';

/** Подписи сайдбара по локалям; ссылки строятся от общего префикса. */
const SIDEBAR_LABELS: Record<DocsLocale, Record<string, string>> = {
  en: {
    gettingStarted: 'Getting started',
    quickStart: 'Quick start',
    configuration: 'Configuration',
    bundle: 'Installation and bundle size',
    dataAxes: 'Data and axes',
    seriesOptions: 'Common series options',
    labels: 'Value labels',
    axes: 'Axes',
    chartComponents: 'Chart components',
    captions: 'Title and subtitle',
    legend: 'Legend',
    tooltip: 'Tooltip',
    crosshair: 'Crosshair',
    annotations: 'Annotations',
    interaction: 'Interaction',
    zoom: 'Zoom and Navigator',
    selection: 'Data selection',
    listeners: 'Events (listeners)',
    control: 'Programmatic control',
    state: 'State and synchronization',
    styling: 'Styling',
    themes: 'Themes',
    themeBuilder: 'Theme builder',
    accessibility: 'Accessibility and localization',
    series: 'Series',
    cartesian: 'Cartesian',
    polar: 'Pie and polar',
    hierarchies: 'Hierarchies and flows',
    special: 'Special',
    funnelPyramid: 'Funnel and Pyramid',
  },
  ru: {
    gettingStarted: 'Начало работы',
    quickStart: 'Быстрый старт',
    configuration: 'Конфигурация',
    bundle: 'Подключение и размер бандла',
    dataAxes: 'Данные и оси',
    seriesOptions: 'Общие опции серий',
    labels: 'Подписи значений',
    axes: 'Оси',
    chartComponents: 'Компоненты чарта',
    captions: 'Заголовки',
    legend: 'Легенда',
    tooltip: 'Тултип',
    crosshair: 'Crosshair',
    annotations: 'Аннотации',
    interaction: 'Взаимодействие',
    zoom: 'Zoom и Navigator',
    selection: 'Выделение данных',
    listeners: 'События (listeners)',
    control: 'Программное управление',
    state: 'Состояние и синхронизация',
    styling: 'Оформление',
    themes: 'Темы',
    themeBuilder: 'Конструктор тем',
    accessibility: 'Доступность и локализация',
    series: 'Серии',
    cartesian: 'Декартовы',
    polar: 'Круговые и полярные',
    hierarchies: 'Иерархии и потоки',
    special: 'Специальные',
    funnelPyramid: 'Funnel и Pyramid',
  },
};

function mainSidebar(locale: DocsLocale) {
  const t = SIDEBAR_LABELS[locale];
  const base = locale === 'en' ? '' : '/ru';
  return [
    {
      text: t.gettingStarted,
      collapsed: false,
      items: [
        { text: t.quickStart, link: `${base}/guide/` },
        { text: t.configuration, link: `${base}/guide/options` },
        { text: t.bundle, link: `${base}/guide/bundle` },
      ],
    },
    {
      text: t.dataAxes,
      collapsed: false,
      items: [
        { text: t.seriesOptions, link: `${base}/guide/series-options` },
        { text: t.axes, link: `${base}/guide/axes` },
      ],
    },
    {
      text: t.chartComponents,
      collapsed: false,
      items: [
        { text: t.labels, link: `${base}/guide/labels` },
        { text: t.captions, link: `${base}/interactivity/captions` },
        { text: t.legend, link: `${base}/interactivity/legend` },
        { text: t.tooltip, link: `${base}/interactivity/tooltip` },
        { text: t.crosshair, link: `${base}/interactivity/crosshair` },
        { text: t.annotations, link: `${base}/interactivity/annotations` },
      ],
    },
    {
      text: t.interaction,
      collapsed: false,
      items: [
        { text: t.zoom, link: `${base}/interactivity/zoom` },
        { text: t.selection, link: `${base}/interactivity/selection` },
        { text: t.listeners, link: `${base}/interactivity/listeners` },
        { text: t.control, link: `${base}/interactivity/control` },
        { text: t.state, link: `${base}/interactivity/state` },
      ],
    },
    {
      text: t.styling,
      collapsed: false,
      items: [
        { text: t.themes, link: `${base}/guide/themes` },
        // конструктор существует только на английском — ссылка без префикса локали
        { text: t.themeBuilder, link: '/guide/theme-builder' },
        { text: t.accessibility, link: `${base}/guide/accessibility` },
      ],
    },
    {
      text: t.series,
      collapsed: false,
      items: [
        {
          text: t.cartesian,
          collapsed: false,
          items: [
            { text: 'Line', link: `${base}/series/line` },
            { text: 'Bar', link: `${base}/series/bar` },
            { text: 'Area', link: `${base}/series/area` },
            { text: 'Scatter', link: `${base}/series/scatter` },
            { text: 'Bubble', link: `${base}/series/bubble` },
            { text: 'Histogram', link: `${base}/series/histogram` },
            { text: 'Heatmap', link: `${base}/series/heatmap` },
            { text: 'Range', link: `${base}/series/range` },
            { text: 'Box Plot', link: `${base}/series/box-plot` },
            { text: 'Waterfall', link: `${base}/series/waterfall` },
            { text: 'Candlestick / OHLC', link: `${base}/series/candlestick` },
          ],
        },
        {
          text: t.polar,
          collapsed: false,
          items: [
            { text: 'Pie / Donut', link: `${base}/series/pie` },
            { text: 'Radar', link: `${base}/series/radar` },
            { text: 'Nightingale / Radial', link: `${base}/series/radial` },
          ],
        },
        {
          text: t.hierarchies,
          collapsed: false,
          items: [
            { text: 'Treemap', link: `${base}/series/hierarchy` },
            { text: 'Sunburst', link: `${base}/series/sunburst` },
            { text: 'Sankey / Chord', link: `${base}/series/flow` },
          ],
        },
        {
          text: t.special,
          collapsed: false,
          items: [
            { text: 'Sparklines', link: `${base}/series/sparklines` },
            { text: t.funnelPyramid, link: `${base}/series/funnel` },
            { text: 'Gauges', link: `${base}/series/gauge` },
          ],
        },
      ],
    },
  ];
}

export default defineConfig({
  title: 'Grafit charts',
  base: SITE_BASE,

  // base не подставляется в head автоматически — прописываем сами
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${SITE_BASE}logo.svg` }]],

  // общий themeConfig мержится в обе локали
  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/plixplox/grafit-charts' }],
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      description: 'Declarative canvas charting library',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Series', link: '/series/line' },
          { text: 'API', link: '/reference/' },
        ],
        sidebar: {
          '/reference/': referenceSidebar(),
          '/guide/': mainSidebar('en'),
          '/interactivity/': mainSidebar('en'),
          '/series/': mainSidebar('en'),
        },
        outline: { label: 'On this page' },
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru-RU',
      link: '/ru/',
      description: 'Декларативная canvas-библиотека чартов',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/guide/' },
          { text: 'Серии', link: '/ru/series/line' },
          // справочник генерируется typedoc один раз и живёт в en-локали
          { text: 'API', link: '/reference/' },
        ],
        sidebar: {
          '/ru/guide/': mainSidebar('ru'),
          '/ru/interactivity/': mainSidebar('ru'),
          '/ru/series/': mainSidebar('ru'),
        },
        outline: { label: 'На этой странице' },
        docFooter: { prev: 'Назад', next: 'Вперёд' },
      },
    },
  },

  vite: {
    resolve: {
      alias: {
        // docs:dev — основной полигон разработки: библиотека компилируется
        // из исходников с HMR, отдельный playground не нужен.
        'grafit-charts': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
        '@': fileURLToPath(new URL('../../src', import.meta.url)),
      },
    },
  },
  markdown: {
    config(md) {
      md.use(chartExamplePlugin);
      md.use(typeAutolinkPlugin);
    },
  },
});
