import ChartExample from './components/ChartExample.vue';
import ThemeBuilder from './components/ThemeBuilder.vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ChartExample', ChartExample);
    app.component('ThemeBuilder', ThemeBuilder);
  },
} satisfies Theme;
