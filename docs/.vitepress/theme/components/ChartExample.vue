<script setup lang="ts">
import type { ChartInstance, ChartOptions } from 'grafit-charts';
import { useData } from 'vitepress';
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

const props = withDefaults(defineProps<{ name: string; height?: number }>(), { height: 360 });

/** Кнопка под демкой: пример, которому мало одного кадра, объявляет их сам. */
interface DemoAction {
  label: string;
  run: (chart: ChartInstance) => void;
}

const container = ref<HTMLElement>();
const { isDark } = useData();
const actions = shallowRef<DemoAction[]>([]);
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
  const { createOptions, actions: demoActions } = mod as {
    createOptions: () => ChartOptions;
    actions?: DemoAction[];
  };
  const options = createOptions();
  // тема сайта применяется, только если пример не задал собственную
  ownTheme = options.theme !== undefined;
  chart = Charts.create({
    ...options,
    container: container.value,
    theme: options.theme ?? (isDark.value ? 'dark' : 'default'),
  });
  actions.value = demoActions ?? [];
});

let ownTheme = false;

function run(action: DemoAction): void {
  if (chart) action.run(chart);
}

watch(isDark, (dark) => {
  if (ownTheme) return;
  void chart?.updateDelta({ theme: dark ? 'dark' : 'default' });
});

onUnmounted(() => {
  chart?.destroy();
});
</script>

<template>
  <div class="chart-example">
    <div ref="container" class="chart-example__canvas" :style="{ height: `${props.height}px` }" />
    <div v-if="actions.length > 0" class="chart-example__actions">
      <button v-for="action in actions" :key="action.label" type="button" @click="run(action)">
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chart-example {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.chart-example__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.chart-example__actions button {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.chart-example__actions button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>
