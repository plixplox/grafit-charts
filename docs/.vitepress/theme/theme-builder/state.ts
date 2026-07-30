import type { ThemeName, ThemeOptions } from 'grafit-charts';

/**
 * Чистая логика билдера тем: черновик, его сжатие до экспортного вида,
 * сериализация и разбор импортируемого JSON. Вынесена из .vue, потому что
 * ESLint без Vue-парсера и tsconfig не видят содержимое SFC — здесь всё
 * проверяется `npx tsc --noEmit` и `eslint .`.
 *
 * Черновик — это и есть `ThemeOptions`: контролы показывают
 * `resolveTheme(draft)`, а пишут в `draft`. Экспорт тогда сводится к выбрасыванию
 * пустых веток, без диффа с базовой темой.
 *
 * Импорт из grafit-charts здесь только типовой: библиотека подгружается
 * динамически в компоненте, иначе она попала бы в общий чанк доков и грузилась
 * бы на каждой странице.
 */

export const STORAGE_KEY = 'grafit:theme-builder';
export const EXPORT_FILENAME = 'grafit-theme.json';

export type ParamKey = keyof NonNullable<ThemeOptions['params']>;
export type AxisKey = keyof NonNullable<ThemeOptions['axis']>;

export const COLOR_PARAMS = [
  { key: 'backgroundColor', label: 'Background' },
  { key: 'foregroundColor', label: 'Text' },
  { key: 'mutedColor', label: 'Secondary text' },
  { key: 'axisColor', label: 'Axis and grid' },
] as const satisfies ReadonlyArray<{ key: ParamKey; label: string }>;

export const SEMANTIC_PARAMS = [
  { key: 'positiveColor', label: 'Positive' },
  { key: 'negativeColor', label: 'Negative' },
] as const satisfies ReadonlyArray<{ key: ParamKey; label: string }>;

export const MARK_PARAMS = [
  { key: 'strokeWidth', label: 'Data line width', min: 0.5, max: 8, step: 0.5, clearable: false },
  { key: 'markStrokeWidth', label: 'Mark outline width', min: 0, max: 6, step: 0.5, clearable: true },
  { key: 'cornerRadius', label: 'Corner radius', min: 0, max: 20, step: 1, clearable: true },
  { key: 'fillOpacity', label: 'Fill opacity', min: 0.05, max: 1, step: 0.05, clearable: true },
] as const satisfies ReadonlyArray<{ key: ParamKey; label: string; min: number; max: number; step: number; clearable: boolean }>;

/** Числовые токены осей: подпись, диапазон и то, откуда берётся значение по умолчанию. */
export const AXIS_NUMBERS = [
  { key: 'strokeWidth', label: 'Line thickness', min: 0.5, max: 4, step: 0.5 },
  { key: 'tickSize', label: 'Tick length', min: 0, max: 16, step: 1 },
  { key: 'labelSize', label: 'Label size', min: 6, max: 20, step: 1 },
  { key: 'labelSpacing', label: 'Label gap', min: 0, max: 24, step: 1 },
  { key: 'titleSize', label: 'Title size', min: 6, max: 24, step: 1 },
] as const satisfies ReadonlyArray<{ key: AxisKey; label: string; min: number; max: number; step: number }>;

export const AXIS_COLORS = [
  { key: 'color', label: 'Axis line' },
  { key: 'gridColor', label: 'Grid' },
  { key: 'tickColor', label: 'Ticks' },
  { key: 'labelColor', label: 'Labels' },
  { key: 'titleColor', label: 'Title' },
] as const satisfies ReadonlyArray<{ key: AxisKey; label: string }>;

export const FONT_STACKS = [
  'system-ui, sans-serif',
  'Inter, system-ui, sans-serif',
  'Georgia, serif',
  '"IBM Plex Mono", ui-monospace, monospace',
  '"Helvetica Neue", Arial, sans-serif',
];

export const GRID_STYLES = [
  { label: 'Dashed', value: [4, 4] },
  { label: 'Solid', value: [] },
  { label: 'Dotted', value: [1, 3] },
  { label: 'Sparse', value: [2, 6] },
] as const;

/** Штрих сетки → подпись в селекте; неизвестный набор показываем как «Custom». */
export function gridStyleLabel(dash: number[] | undefined): string {
  if (!dash) return 'Dashed';
  const match = GRID_STYLES.find((style) => style.value.length === dash.length && style.value.every((v, i) => v === dash[i]));
  return match?.label ?? 'Custom';
}

export const LINE_STYLES = [
  { label: 'Solid', value: [] },
  { label: 'Dashed', value: [6, 4] },
  { label: 'Dotted', value: [1, 3] },
  { label: 'Dash-dot', value: [8, 3, 2, 3] },
] as const;

export function lineStyleLabel(dash: number[] | undefined): string {
  if (!dash) return 'Solid';
  const match = LINE_STYLES.find((style) => style.value.length === dash.length && style.value.every((v, i) => v === dash[i]));
  return match?.label ?? 'Custom';
}

/**
 * Легенда и тултип — обычные блоки ChartOptions, до них `overrides.common`
 * дотягивается как есть, поэтому отдельных токенов темы для них не заводим:
 * два пути к одному пикселю хуже одного.
 */
export type ComponentKey = 'legend' | 'tooltip';

export interface ComponentControl {
  /** Путь внутри блока: 'background.fill', 'item.label.fontSize'. */
  path: string;
  label: string;
  kind: 'color' | 'number' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  choices?: readonly string[];
  /** Токен темы, из которого берётся цвет, пока значение не задано. */
  fallback?: 'foregroundColor' | 'backgroundColor' | 'mutedColor' | 'axisColor';
  /** Подпись «как сейчас», когда значение не задано. */
  hint?: string;
}

export const LEGEND_CONTROLS: ComponentControl[] = [
  { path: 'enabled', label: 'Show legend', kind: 'toggle', hint: 'on' },
  {
    path: 'position',
    label: 'Position',
    kind: 'select',
    choices: ['bottom', 'top', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    hint: 'bottom',
  },
  { path: 'item.label.fontSize', label: 'Label size', kind: 'number', min: 6, max: 20, step: 1, hint: '12' },
  { path: 'item.label.color', label: 'Label colour', kind: 'color', fallback: 'foregroundColor' },
  { path: 'item.marker.size', label: 'Marker size', kind: 'number', min: 4, max: 24, step: 1, hint: '10' },
  { path: 'background.fill', label: 'Panel fill', kind: 'color', fallback: 'backgroundColor' },
  { path: 'background.stroke', label: 'Panel border', kind: 'color', fallback: 'axisColor' },
  { path: 'background.strokeWidth', label: 'Border width', kind: 'number', min: 0, max: 4, step: 0.5, hint: '1' },
  { path: 'background.cornerRadius', label: 'Panel radius', kind: 'number', min: 0, max: 20, step: 1, hint: '4' },
  { path: 'background.padding', label: 'Panel padding', kind: 'number', min: 0, max: 24, step: 1, hint: '8' },
];

export const TOOLTIP_CONTROLS: ComponentControl[] = [
  { path: 'enabled', label: 'Show tooltip', kind: 'toggle', hint: 'on' },
  { path: 'mode', label: 'Mode', kind: 'select', choices: ['single', 'shared'], hint: 'single' },
  { path: 'background', label: 'Background', kind: 'color', fallback: 'backgroundColor' },
  { path: 'color', label: 'Text', kind: 'color', fallback: 'foregroundColor' },
  { path: 'borderColor', label: 'Border', kind: 'color', fallback: 'mutedColor' },
  { path: 'borderWidth', label: 'Border width', kind: 'number', min: 0, max: 4, step: 0.5, hint: '1' },
  { path: 'borderRadius', label: 'Corner radius', kind: 'number', min: 0, max: 20, step: 1, hint: '6' },
  { path: 'fontSize', label: 'Font size', kind: 'number', min: 8, max: 20, step: 1, hint: '12' },
];

export function emptyDraft(baseTheme: ThemeName): ThemeOptions {
  return { baseTheme };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Значение по точечному пути; undefined, если хоть одно звено отсутствует. */
export function readPath(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const key of path.split('.')) {
    if (!isPlainObject(node)) return undefined;
    node = node[key];
  }
  return node;
}

/** Иммутабельная запись по точечному пути; undefined удаляет ветку до пустоты. */
function writePath(source: Record<string, unknown> | undefined, keys: string[], value: unknown): Record<string, unknown> | undefined {
  const [head, ...rest] = keys;
  if (head === undefined) return source;
  const current = { ...(source ?? {}) };
  if (rest.length === 0) {
    if (value === undefined) delete current[head];
    else current[head] = value;
  } else {
    const child = writePath(isPlainObject(current[head]) ? current[head] : undefined, rest, value);
    if (child && Object.keys(child).length > 0) current[head] = child;
    else delete current[head];
  }
  return Object.keys(current).length > 0 ? current : undefined;
}

/** Пишет значение в overrides.common.<component>.<path>, вычищая опустевшие ветки. */
export function setOverride(
  overrides: ThemeOptions['overrides'],
  component: ComponentKey,
  path: string,
  value: unknown,
): ThemeOptions['overrides'] {
  const next = writePath(overrides as Record<string, unknown> | undefined, ['common', component, ...path.split('.')], value);
  return next as ThemeOptions['overrides'];
}

export function readOverride(overrides: ThemeOptions['overrides'], component: ComponentKey, path: string): unknown {
  return readPath(readPath(overrides, `common.${component}`), path);
}

function withoutEmpty<T extends Record<string, unknown>>(source: T | undefined): T | undefined {
  if (!source) return undefined;
  const entries = Object.entries(source).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as T) : undefined;
}

/** Экспортный вид: только то, что пользователь действительно задал. */
export function pruneDraft(draft: ThemeOptions): ThemeOptions {
  const result: ThemeOptions = { baseTheme: draft.baseTheme ?? 'default' };
  const palette = withoutEmpty(draft.palette as Record<string, unknown> | undefined);
  const params = withoutEmpty(draft.params as Record<string, unknown> | undefined);
  const axis = withoutEmpty(draft.axis as Record<string, unknown> | undefined);
  if (palette) result.palette = palette as ThemeOptions['palette'];
  if (params) result.params = params as ThemeOptions['params'];
  if (axis) result.axis = axis as ThemeOptions['axis'];
  if (draft.overrides && Object.keys(draft.overrides).length > 0) result.overrides = draft.overrides;
  return result;
}

export function serializeDraft(draft: ThemeOptions): string {
  return `${JSON.stringify(pruneDraft(draft), null, 2)}\n`;
}

export interface ParseResult {
  theme?: ThemeOptions;
  error?: string;
  warnings: string[];
}

const COLOR_KEYS = new Set<string>([...COLOR_PARAMS, ...SEMANTIC_PARAMS].map((param) => param.key));
const NUMBER_KEYS = new Set<string>(['fontSize', 'strokeWidth', 'cornerRadius', 'fillOpacity']);

/** Цвет годится, если браузер его понимает; вне браузера — грубая проверка на непустую строку. */
function isColor(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const css = (globalThis as { CSS?: { supports?: (property: string, value: string) => boolean } }).CSS;
  return css?.supports ? css.supports('color', value) : true;
}

function isColorList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isColor);
}

/**
 * Разбирает импортируемый JSON. Неизвестные и негодные поля отбрасываются
 * с предупреждением — частично валидная тема лучше отказа целиком.
 */
export function parseTheme(text: string, themeNames: readonly string[]): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: 'Not valid JSON.', warnings: [] };
  }
  if (!isPlainObject(raw)) return { error: 'Expected a JSON object with a theme in it.', warnings: [] };

  const warnings: string[] = [];
  const theme: ThemeOptions = {};

  if (raw.baseTheme !== undefined) {
    if (typeof raw.baseTheme === 'string' && themeNames.includes(raw.baseTheme)) {
      theme.baseTheme = raw.baseTheme as ThemeName;
    } else {
      warnings.push(`Unknown baseTheme ${JSON.stringify(raw.baseTheme)} — using "default".`);
    }
  }

  if (raw.palette !== undefined) {
    if (isPlainObject(raw.palette)) {
      const palette: NonNullable<ThemeOptions['palette']> = {};
      for (const key of ['fills', 'strokes', 'sequential'] as const) {
        const value = raw.palette[key];
        if (value === undefined) continue;
        if (isColorList(value)) palette[key] = value;
        else warnings.push(`palette.${key} is not a list of colours — ignored.`);
      }
      if (Object.keys(palette).length > 0) theme.palette = palette;
    } else {
      warnings.push('palette is not an object — ignored.');
    }
  }

  if (raw.params !== undefined) {
    if (isPlainObject(raw.params)) {
      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(raw.params)) {
        if (COLOR_KEYS.has(key)) {
          if (isColor(value)) params[key] = value;
          else warnings.push(`params.${key} is not a colour — ignored.`);
        } else if (NUMBER_KEYS.has(key)) {
          if (typeof value === 'number' && Number.isFinite(value) && value >= 0) params[key] = value;
          else warnings.push(`params.${key} is not a positive number — ignored.`);
        } else if (key === 'fontFamily') {
          if (typeof value === 'string' && value.trim() !== '') params[key] = value;
          else warnings.push('params.fontFamily is not a font stack — ignored.');
        } else {
          warnings.push(`Unknown token params.${key} — ignored.`);
        }
      }
      if (Object.keys(params).length > 0) theme.params = params as ThemeOptions['params'];
    } else {
      warnings.push('params is not an object — ignored.');
    }
  }

  if (raw.axis !== undefined) {
    if (isPlainObject(raw.axis)) {
      const axis: Record<string, unknown> = {};
      for (const key of ['line', 'tick', 'gridLine'] as const) {
        if (raw.axis[key] === undefined) continue;
        if (typeof raw.axis[key] === 'boolean') axis[key] = raw.axis[key];
        else warnings.push(`axis.${key} is not a boolean — ignored.`);
      }
      if (raw.axis.strokeWidth !== undefined) {
        if (typeof raw.axis.strokeWidth === 'number' && Number.isFinite(raw.axis.strokeWidth) && raw.axis.strokeWidth >= 0) {
          axis.strokeWidth = raw.axis.strokeWidth;
        } else {
          warnings.push('axis.strokeWidth is not a positive number — ignored.');
        }
      }
      if (raw.axis.gridDash !== undefined) {
        const dash = raw.axis.gridDash;
        if (Array.isArray(dash) && dash.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)) axis.gridDash = dash;
        else warnings.push('axis.gridDash is not a list of numbers — ignored.');
      }
      if (Object.keys(axis).length > 0) theme.axis = axis as ThemeOptions['axis'];
    } else {
      warnings.push('axis is not an object — ignored.');
    }
  }

  // overrides — «сырой» блок опций чарта, билдер его не редактирует, но переносит как есть
  if (raw.overrides !== undefined) {
    if (isPlainObject(raw.overrides)) theme.overrides = raw.overrides as ThemeOptions['overrides'];
    else warnings.push('overrides is not an object — ignored.');
  }

  return { theme, warnings };
}

export function downloadJson(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(themeNames: readonly string[]): ThemeOptions | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return undefined;
    return parseTheme(stored, themeNames).theme;
  } catch {
    return undefined;
  }
}

export function saveDraft(draft: ThemeOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeDraft(draft));
  } catch {
    // приватный режим или переполненное хранилище — билдер работает и без сохранения
  }
}
