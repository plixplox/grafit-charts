<script setup lang="ts">
import { PREVIEWS } from '../theme-builder/previews';
import {
  AXIS_COLORS,
  AXIS_NUMBERS,
  COLOR_PARAMS,
  EXPORT_FILENAME,
  FONT_STACKS,
  GRID_STYLES,
  LEGEND_CONTROLS,
  LINE_STYLES,
  MARK_PARAMS,
  SEMANTIC_PARAMS,
  TOOLTIP_CONTROLS,
  copyText,
  downloadJson,
  emptyDraft,
  gridStyleLabel,
  lineStyleLabel,
  loadDraft,
  parseTheme,
  readOverride,
  saveDraft,
  serializeDraft,
  setOverride,
  type AxisKey,
  type ComponentControl,
  type ComponentKey,
  type ParamKey,
} from '../theme-builder/state';
import type { ChartInstance, ThemeName, ThemeOptions } from 'grafit-charts';
import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

const { isDark } = useData();

// Библиотека грузится динамически: статический импорт утащил бы её в общий
// чанк доков, и она приезжала бы на каждой странице сайта.
const lib = shallowRef<typeof import('grafit-charts')>();
const themeNames = computed(() => lib.value?.THEME_NAMES ?? []);

// Черновик и есть экспортируемая тема; контролы читают resolveTheme(draft).
const draft = ref<ThemeOptions>(emptyDraft('default'));
const resolved = computed(() => lib.value?.resolveTheme(draft.value));
const json = computed(() => serializeDraft(draft.value));

const hosts = ref<HTMLElement[]>([]);
const charts: Array<ChartInstance | undefined> = [];
const importText = ref('');
const importError = ref('');
const importWarnings = ref<string[]>([]);
const copied = ref(false);

function setParam(key: ParamKey, value: string | number | number[] | undefined): void {
  const params = { ...draft.value.params };
  if (value === undefined || value === '') delete params[key];
  else Object.assign(params, { [key]: value });
  draft.value = { ...draft.value, params };
}

function setAxis(key: AxisKey, value: string | boolean | number | number[]): void {
  draft.value = { ...draft.value, axis: { ...draft.value.axis, [key]: value } };
}

/** Значение числового токена оси с учётом того, откуда берётся дефолт. */
function axisNumber(key: (typeof AXIS_NUMBERS)[number]['key']): number {
  const axis = resolved.value?.axis;
  if (!axis) return 0;
  switch (key) {
    case 'tickSize':
      return axis.tickSize ?? 6;
    case 'labelSize':
      return axis.labelSize ?? resolved.value?.fontSize ?? 11;
    case 'labelSpacing':
      return axis.labelSpacing ?? 8;
    case 'titleSize':
      return axis.titleSize ?? (resolved.value?.fontSize ?? 11) + 1;
    default:
      return axis.strokeWidth;
  }
}

/** Цвет элемента оси; пока не задан — тот токен, на который он опирается. */
function axisColor(key: (typeof AXIS_COLORS)[number]['key']): string {
  const theme = resolved.value;
  if (!theme) return '#000000';
  const own = theme.axis[key];
  if (typeof own === 'string') return own;
  if (key === 'labelColor') return theme.mutedColor;
  if (key === 'titleColor') return theme.foregroundColor;
  return theme.axisColor;
}

/** Выбранный пресет штриха из селекта. */
function pickDash(event: Event, styles: ReadonlyArray<{ label: string; value: readonly number[] }>): number[] {
  const label = (event.target as HTMLSelectElement).value;
  return [...(styles.find((style) => style.label === label)?.value ?? [])];
}

function componentValue(component: ComponentKey, control: ComponentControl): string | number | undefined {
  const value = readOverride(draft.value.overrides, component, control.path);
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function componentFlag(component: ComponentKey, control: ComponentControl): boolean {
  const value = readOverride(draft.value.overrides, component, control.path);
  return value !== false;
}

function componentColor(component: ComponentKey, control: ComponentControl): string {
  const own = componentValue(component, control);
  if (typeof own === 'string') return own;
  const theme = resolved.value;
  return (control.fallback && theme ? theme[control.fallback] : undefined) ?? '#888888';
}

function setComponent(component: ComponentKey, control: ComponentControl, value: string | number | boolean | undefined): void {
  draft.value = { ...draft.value, overrides: setOverride(draft.value.overrides, component, control.path, value) };
}

function setPalette(key: 'fills' | 'strokes' | 'sequential', colors: string[] | undefined): void {
  const palette = { ...draft.value.palette };
  if (colors === undefined) delete palette[key];
  else palette[key] = colors;
  draft.value = { ...draft.value, palette };
}

const fills = computed(() => draft.value.palette?.fills ?? resolved.value?.palette.fills ?? []);
const sequential = computed(() => draft.value.palette?.sequential ?? resolved.value?.palette.sequential ?? []);
const strokesLinked = computed(() => draft.value.palette?.strokes === undefined);

function setFill(index: number, color: string): void {
  const next = [...fills.value];
  next[index] = color;
  setPalette('fills', next);
}

function addFill(): void {
  const base = resolved.value?.palette.fills ?? [];
  setPalette('fills', [...fills.value, base[fills.value.length % Math.max(base.length, 1)] ?? '#888888']);
}

function removeFill(index: number): void {
  if (fills.value.length <= 1) return;
  setPalette(
    'fills',
    fills.value.filter((_, i) => i !== index),
  );
}

function setSequentialStop(index: number, color: string): void {
  const next = [...sequential.value];
  next[index] = color;
  setPalette('sequential', next);
}

function selectBase(name: ThemeName): void {
  // смена пресета — осознанный сброс: иначе непонятно, что из правок «своё»
  draft.value = emptyDraft(name);
}

function resetToPreset(): void {
  selectBase(draft.value.baseTheme ?? 'default');
}

function applyImport(text: string): void {
  const { theme, error, warnings } = parseTheme(text, themeNames.value);
  importError.value = error ?? '';
  importWarnings.value = warnings;
  if (theme) draft.value = theme;
}

function onImportFile(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  void file.text().then((text) => {
    importText.value = text;
    applyImport(text);
  });
}

async function onCopy(): Promise<void> {
  copied.value = await copyText(json.value);
  setTimeout(() => (copied.value = false), 1500);
}

let frame = 0;
function renderPreviews(): void {
  cancelAnimationFrame(frame);
  // за одно движение слайдера прилетает десяток событий — перерисовываем раз в кадр
  frame = requestAnimationFrame(() => {
    PREVIEWS.forEach((preview, index) => {
      const host = hosts.value[index];
      if (!host) return;
      // update, а не updateDelta: deepMerge не умеет убирать ключ, и сброс токена не откатился бы
      void charts[index]?.update({ ...preview.create(), container: host, theme: draft.value, animation: { enabled: false } });
    });
  });
}

onMounted(async () => {
  const loaded = await import('grafit-charts');
  lib.value = loaded;
  draft.value = loadDraft(loaded.THEME_NAMES) ?? emptyDraft(isDark.value ? 'dark' : 'default');
  PREVIEWS.forEach((preview, index) => {
    const host = hosts.value[index];
    if (!host) return;
    charts[index] = loaded.Charts.create({
      ...preview.create(),
      container: host,
      theme: draft.value,
      animation: { enabled: false },
    });
  });
});

watch(
  draft,
  (value) => {
    saveDraft(value);
    renderPreviews();
  },
  { deep: true },
);

onUnmounted(() => {
  cancelAnimationFrame(frame);
  for (const chart of charts) chart?.destroy();
});
</script>

<template>
  <div class="tb">
    <aside v-if="resolved" class="tb-panel">
      <section class="tb-group">
        <h3>Base theme</h3>
        <select :value="draft.baseTheme ?? 'default'" @change="selectBase(($event.target as HTMLSelectElement).value as ThemeName)">
          <option v-for="name in themeNames" :key="name" :value="name">{{ name }}</option>
        </select>
        <button class="tb-reset" type="button" @click="resetToPreset">Reset to preset</button>
      </section>

      <section class="tb-group">
        <h3>Series palette</h3>
        <div class="tb-swatches">
          <div v-for="(color, index) in fills" :key="index" class="tb-swatch">
            <input type="color" :value="color" @input="setFill(index, ($event.target as HTMLInputElement).value)" />
            <button v-if="fills.length > 1" type="button" title="Remove" @click="removeFill(index)">×</button>
          </div>
          <button class="tb-add" type="button" title="Add colour" @click="addFill">+</button>
        </div>
        <label class="tb-check">
          <input
            type="checkbox"
            :checked="strokesLinked"
            @change="setPalette('strokes', ($event.target as HTMLInputElement).checked ? undefined : [...fills])"
          />
          Outlines follow the fills
        </label>
      </section>

      <section class="tb-group">
        <h3>Colours</h3>
        <label v-for="param in COLOR_PARAMS" :key="param.key" class="tb-row">
          <span>{{ param.label }}</span>
          <input type="color" :value="resolved[param.key]" @input="setParam(param.key, ($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section class="tb-group">
        <h3>Typography</h3>
        <label class="tb-row tb-row-wide">
          <span>Font</span>
          <select :value="resolved.fontFamily" @change="setParam('fontFamily', ($event.target as HTMLSelectElement).value)">
            <option v-for="stack in FONT_STACKS" :key="stack" :value="stack">{{ stack }}</option>
            <option v-if="!FONT_STACKS.includes(resolved.fontFamily)" :value="resolved.fontFamily">
              {{ resolved.fontFamily }}
            </option>
          </select>
        </label>
        <label class="tb-row">
          <span
            >Base size <b>{{ resolved.fontSize }}px</b></span
          >
          <input
            type="range"
            min="8"
            max="20"
            step="1"
            :value="resolved.fontSize"
            @input="setParam('fontSize', Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <p class="tb-note">Every other label size moves with the base — the title stays six steps above it.</p>
      </section>

      <section class="tb-group">
        <h3>Marks</h3>
        <label v-for="param in MARK_PARAMS" :key="param.key" class="tb-row">
          <span>
            {{ param.label }}
            <b>{{ resolved[param.key] ?? 'auto' }}</b>
          </span>
          <span class="tb-slider">
            <input
              type="range"
              :min="param.min"
              :max="param.max"
              :step="param.step"
              :value="resolved[param.key] ?? param.min"
              @input="setParam(param.key, Number(($event.target as HTMLInputElement).value))"
            />
            <button v-if="param.clearable" type="button" title="Back to per-mark defaults" @click="setParam(param.key, undefined)">
              ×
            </button>
          </span>
        </label>
        <label class="tb-row tb-row-wide">
          <span>Data line style</span>
          <select :value="lineStyleLabel(resolved.lineDash)" @change="setParam('lineDash', pickDash($event, LINE_STYLES))">
            <option v-for="style in LINE_STYLES" :key="style.label" :value="style.label">{{ style.label }}</option>
          </select>
        </label>
        <p class="tb-note">“auto” leaves each mark its own default — a bar stays square while a range bar stays rounded.</p>
      </section>

      <section class="tb-group">
        <h3>Positive and negative</h3>
        <label v-for="param in SEMANTIC_PARAMS" :key="param.key" class="tb-row">
          <span>{{ param.label }}</span>
          <input type="color" :value="resolved[param.key]" @input="setParam(param.key, ($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section class="tb-group">
        <h3>Sequential ramp</h3>
        <div class="tb-swatches">
          <div v-for="(color, index) in sequential" :key="index" class="tb-swatch">
            <input type="color" :value="color" @input="setSequentialStop(index, ($event.target as HTMLInputElement).value)" />
          </div>
        </div>
      </section>

      <details class="tb-group" open>
        <summary>Axes</summary>
        <label class="tb-check">
          <input type="checkbox" :checked="resolved.axis.line" @change="setAxis('line', ($event.target as HTMLInputElement).checked)" />
          Axis line
        </label>
        <label class="tb-check">
          <input type="checkbox" :checked="resolved.axis.tick" @change="setAxis('tick', ($event.target as HTMLInputElement).checked)" />
          Tick marks
        </label>
        <label class="tb-check">
          <input
            type="checkbox"
            :checked="resolved.axis.gridLine"
            @change="setAxis('gridLine', ($event.target as HTMLInputElement).checked)"
          />
          Grid lines
        </label>

        <label v-for="metric in AXIS_NUMBERS" :key="metric.key" class="tb-row">
          <span>
            {{ metric.label }}
            <b>{{ axisNumber(metric.key) }}</b>
          </span>
          <input
            type="range"
            :min="metric.min"
            :max="metric.max"
            :step="metric.step"
            :value="axisNumber(metric.key)"
            @input="setAxis(metric.key, Number(($event.target as HTMLInputElement).value))"
          />
        </label>

        <label v-for="swatch in AXIS_COLORS" :key="swatch.key" class="tb-row">
          <span>{{ swatch.label }}</span>
          <input type="color" :value="axisColor(swatch.key)" @input="setAxis(swatch.key, ($event.target as HTMLInputElement).value)" />
        </label>

        <label class="tb-row tb-row-wide">
          <span>Axis line style</span>
          <select :value="lineStyleLabel(resolved.axis.lineDash)" @change="setAxis('lineDash', pickDash($event, LINE_STYLES))">
            <option v-for="style in LINE_STYLES" :key="style.label" :value="style.label">{{ style.label }}</option>
          </select>
        </label>
        <label class="tb-row tb-row-wide">
          <span>Grid style</span>
          <select :value="gridStyleLabel(resolved.axis.gridDash)" @change="setAxis('gridDash', pickDash($event, GRID_STYLES))">
            <option v-for="style in GRID_STYLES" :key="style.label" :value="style.label">{{ style.label }}</option>
          </select>
        </label>
        <p class="tb-note">Colours left alone follow “Axis and grid” and the text colours above.</p>
      </details>

      <details class="tb-group">
        <summary>Legend</summary>
        <template v-for="control in LEGEND_CONTROLS" :key="control.path">
          <label v-if="control.kind === 'toggle'" class="tb-check">
            <input
              type="checkbox"
              :checked="componentFlag('legend', control)"
              @change="setComponent('legend', control, ($event.target as HTMLInputElement).checked)"
            />
            {{ control.label }}
          </label>
          <label v-else class="tb-row" :class="{ 'tb-row-wide': control.kind === 'select' }">
            <span>
              {{ control.label }}
              <b v-if="control.kind === 'number'">{{ componentValue('legend', control) ?? control.hint }}</b>
            </span>
            <span class="tb-slider">
              <select
                v-if="control.kind === 'select'"
                :value="componentValue('legend', control) ?? control.hint"
                @change="setComponent('legend', control, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="choice in control.choices" :key="choice" :value="choice">{{ choice }}</option>
              </select>
              <input
                v-else-if="control.kind === 'color'"
                type="color"
                :value="componentColor('legend', control)"
                @input="setComponent('legend', control, ($event.target as HTMLInputElement).value)"
              />
              <input
                v-else
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                :value="componentValue('legend', control) ?? control.hint"
                @input="setComponent('legend', control, Number(($event.target as HTMLInputElement).value))"
              />
              <button type="button" title="Back to the default" @click="setComponent('legend', control, undefined)">×</button>
            </span>
          </label>
        </template>
      </details>

      <details class="tb-group">
        <summary>Tooltip</summary>
        <template v-for="control in TOOLTIP_CONTROLS" :key="control.path">
          <label v-if="control.kind === 'toggle'" class="tb-check">
            <input
              type="checkbox"
              :checked="componentFlag('tooltip', control)"
              @change="setComponent('tooltip', control, ($event.target as HTMLInputElement).checked)"
            />
            {{ control.label }}
          </label>
          <label v-else class="tb-row" :class="{ 'tb-row-wide': control.kind === 'select' }">
            <span>
              {{ control.label }}
              <b v-if="control.kind === 'number'">{{ componentValue('tooltip', control) ?? control.hint }}</b>
            </span>
            <span class="tb-slider">
              <select
                v-if="control.kind === 'select'"
                :value="componentValue('tooltip', control) ?? control.hint"
                @change="setComponent('tooltip', control, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="choice in control.choices" :key="choice" :value="choice">{{ choice }}</option>
              </select>
              <input
                v-else-if="control.kind === 'color'"
                type="color"
                :value="componentColor('tooltip', control)"
                @input="setComponent('tooltip', control, ($event.target as HTMLInputElement).value)"
              />
              <input
                v-else
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                :value="componentValue('tooltip', control) ?? control.hint"
                @input="setComponent('tooltip', control, Number(($event.target as HTMLInputElement).value))"
              />
              <button type="button" title="Back to the default" @click="setComponent('tooltip', control, undefined)">×</button>
            </span>
          </label>
        </template>
        <p class="tb-note">Hover a preview to see the tooltip — it is drawn on demand, not with the chart.</p>
      </details>
    </aside>

    <div class="tb-main">
      <div class="tb-previews">
        <figure v-for="(preview, index) in PREVIEWS" :key="preview.id" class="tb-preview">
          <figcaption>
            <b>{{ preview.title }}</b>
            <span>{{ preview.hint }}</span>
          </figcaption>
          <div :ref="(el) => (hosts[index] = el as HTMLElement)" class="tb-canvas" />
        </figure>
      </div>

      <section class="tb-output">
        <header>
          <h3>Your theme</h3>
          <div class="tb-actions">
            <button type="button" @click="downloadJson(EXPORT_FILENAME, json)">Download JSON</button>
            <button type="button" @click="onCopy">{{ copied ? 'Copied' : 'Copy' }}</button>
          </div>
        </header>
        <pre>{{ json }}</pre>

        <details>
          <summary>Import a theme</summary>
          <input type="file" accept="application/json,.json" @change="onImportFile" />
          <textarea v-model="importText" rows="6" placeholder="…or paste the JSON here" @blur="applyImport(importText)" />
          <p v-if="importError" class="tb-error">{{ importError }}</p>
          <ul v-if="importWarnings.length" class="tb-warnings">
            <li v-for="warning in importWarnings" :key="warning">{{ warning }}</li>
          </ul>
        </details>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tb {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 24px;
  margin: 24px 0;
}

@media (max-width: 900px) {
  .tb {
    grid-template-columns: minmax(0, 1fr);
  }
}

.tb-panel {
  align-self: start;
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: 4px;
}

@media (max-width: 900px) {
  .tb-panel {
    position: static;
    max-height: none;
  }
}

.tb-group {
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tb-group h3,
.tb-group summary {
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}

.tb-group summary {
  cursor: pointer;
  user-select: none;
}

details.tb-group:not([open]) summary {
  margin-bottom: 0;
}

.tb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 14px;
}

.tb-row-wide select {
  flex: 1;
  min-width: 0;
}

.tb-row b {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.tb-slider {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tb-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.tb-note {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.tb-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tb-swatch {
  position: relative;
}

.tb-swatch button {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  line-height: 14px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
}

.tb-swatch:hover button {
  opacity: 1;
}

input[type='color'] {
  width: 32px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: none;
  cursor: pointer;
}

input[type='range'] {
  width: 120px;
}

select,
textarea {
  width: 100%;
  padding: 5px 7px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

button {
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
}

button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tb-add {
  width: 32px;
  height: 26px;
  padding: 0;
}

.tb-reset {
  margin-top: 8px;
  width: 100%;
}

.tb-previews {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.tb-preview {
  margin: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.tb-preview figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px;
}

.tb-preview figcaption span {
  color: var(--vp-c-text-3);
}

.tb-canvas {
  height: 260px;
}

.tb-output {
  margin-top: 24px;
}

.tb-output header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tb-output h3 {
  margin: 0;
  font-size: 16px;
}

.tb-actions {
  display: flex;
  gap: 8px;
}

.tb-output pre {
  max-height: 320px;
  overflow: auto;
  margin: 12px 0;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
  line-height: 1.5;
}

.tb-output details summary {
  cursor: pointer;
  font-size: 14px;
}

.tb-output details > * {
  margin-top: 8px;
}

.tb-error {
  color: var(--vp-c-danger-1, #e5484d);
  font-size: 13px;
}

.tb-warnings {
  padding-left: 18px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
