import ChartExample from './components/ChartExample.vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ChartExample', ChartExample);
  },
} satisfies Theme;
