<script setup lang="ts">
import type { ChartInstance, ChartOptions } from 'grafit-charts';
import { useData } from 'vitepress';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ name: string; height?: number }>(), { height: 360 });

const container = ref<HTMLElement>();
const { isDark } = useData();
let chart: ChartInstance | undefined;

// Лениво подхватываем все примеры — без ручного реестра.
const examples = import.meta.glob('../../../../examples/*/config.ts');

onMounted(async () => {
  const load = examples[`../../../../examples/${props.name}/config.ts`];
  if (!load || !container.value) {
    console.error(`[ChartExample] пример «${props.name}» не найден в examples/`);
    return;
  }
  const [{ Charts }, mod] = await Promise.all([import('grafit-charts'), load()]);
  const { createOptions } = mod as { createOptions: () => ChartOptions };
  const options = createOptions();
  // тема сайта применяется, только если пример не задал собственную
  ownTheme = options.theme !== undefined;
  chart = Charts.create({
    ...options,
    container: container.value,
    theme: options.theme ?? (isDark.value ? 'dark' : 'default'),
  });
});

let ownTheme = false;

watch(isDark, (dark) => {
  if (ownTheme) return;
  void chart?.updateDelta({ theme: dark ? 'dark' : 'default' });
});

onUnmounted(() => {
  chart?.destroy();
});
</script>

<template>
  <div ref="container" class="chart-example" :style="{ height: `${props.height}px` }" />
</template>

<style scoped>
.chart-example {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
</style>
