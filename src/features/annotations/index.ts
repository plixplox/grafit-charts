import { resolveValue, type ComputedAnnotationValue } from './stats';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LayoutRect, ThemeContext } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels } from '@/shared/options';
import { BandScale, TimeScale, toTimestamp, type AnyScale } from '@/shared/scale';
import { Group, Line, Path, Rect, Text } from '@/shared/scene';

interface AnnotationLabel extends FontOptions {
  text?: string;
}

/** A line knows the number it ended up on, so its label can say it. */
interface LineAnnotationLabel extends AnnotationLabel {
  formatter?: (value: number) => string;
}

export type AnnotationOptions =
  | {
      type: 'horizontal-line';
      /** A level, or the statistic that decides it: `{ stat: 'mean', field: 'price' }`. */
      value: number | ComputedAnnotationValue;
      stroke?: ColorValue;
      strokeWidth?: Pixels;
      lineDash?: Pixels[];
      label?: LineAnnotationLabel;
    }
  | {
      type: 'vertical-line';
      /** A category, a date, a number — or a statistic over a field. */
      value: unknown | ComputedAnnotationValue;
      stroke?: ColorValue;
      strokeWidth?: Pixels;
      lineDash?: Pixels[];
      label?: LineAnnotationLabel;
    }
  | {
      type: 'line';
      start: { x: unknown; y: number };
      end: { x: unknown; y: number };
      stroke?: ColorValue;
      strokeWidth?: Pixels;
      lineDash?: Pixels[];
    }
  | {
      type: 'text';
      x: unknown;
      y: number;
      text: string;
      color?: ColorValue;
      fontSize?: Pixels;
    }
  | {
      type: 'range';
      axis: 'x' | 'y';
      /** Both ends take a statistic too: `[{ stat: 'percentile', percentile: 5, … }, …]`. */
      range: [unknown | ComputedAnnotationValue, unknown | ComputedAnnotationValue];
      fill?: ColorValue;
      fillOpacity?: number;
      label?: AnnotationLabel;
    };

export interface AnnotationsRenderArgs {
  layer: Group;
  plot: LayoutRect;
  xScale: AnyScale;
  yScale: AnyScale;
  theme: ThemeContext;
  /** Rows the computed values are taken over; without them only plain values draw. */
  data?: Datum[];
}

function coordOn(scale: AnyScale, value: unknown): number {
  if (scale instanceof BandScale) return scale.center(value);
  if (scale instanceof TimeScale) return scale.convert(toTimestamp(value));
  return scale.convert(Number(value));
}

/** Declarative annotations in data coordinates (interactive drawing — later). */
export function renderAnnotations(annotations: AnnotationOptions[], args: AnnotationsRenderArgs): void {
  const { layer, plot, xScale, yScale, theme } = args;
  const data = args.data ?? [];
  /** A statistic with nothing to compute over leaves its annotation undrawn. */
  const resolve = (value: unknown): unknown => resolveValue(value, data);

  for (const annotation of annotations) {
    switch (annotation.type) {
      case 'horizontal-line': {
        const value = resolve(annotation.value);
        if (value === undefined) break;
        const y = coordOn(yScale, value);
        if (Number.isNaN(y)) break;
        const line = new Line();
        line.x1 = plot.x;
        line.x2 = plot.x + plot.width;
        line.y1 = line.y2 = y;
        line.stroke = annotation.stroke ?? theme.foregroundColor;
        line.strokeWidth = annotation.strokeWidth ?? 1;
        line.lineDash = annotation.lineDash ?? [5, 4];
        layer.append(line);
        appendLabel(layer, theme, lineLabel(annotation.label, value), plot.x + plot.width - 4, y - 4, 'right', annotation.stroke);
        break;
      }
      case 'vertical-line': {
        const value = resolve(annotation.value);
        if (value === undefined) break;
        const x = coordOn(xScale, value);
        if (Number.isNaN(x)) break;
        const line = new Line();
        line.y1 = plot.y;
        line.y2 = plot.y + plot.height;
        line.x1 = line.x2 = x;
        line.stroke = annotation.stroke ?? theme.foregroundColor;
        line.strokeWidth = annotation.strokeWidth ?? 1;
        line.lineDash = annotation.lineDash ?? [5, 4];
        layer.append(line);
        appendLabel(layer, theme, lineLabel(annotation.label, value), x + 4, plot.y + 12, 'left', annotation.stroke);
        break;
      }
      case 'line': {
        const path = new Path();
        const x1 = coordOn(xScale, annotation.start.x);
        const y1 = coordOn(yScale, annotation.start.y);
        const x2 = coordOn(xScale, annotation.end.x);
        const y2 = coordOn(yScale, annotation.end.y);
        if ([x1, y1, x2, y2].some(Number.isNaN)) break;
        path.moveTo(x1, y1).lineTo(x2, y2);
        path.stroke = annotation.stroke ?? theme.foregroundColor;
        path.strokeWidth = annotation.strokeWidth ?? 1.5;
        if (annotation.lineDash) path.lineDash = annotation.lineDash;
        layer.append(path);
        break;
      }
      case 'text': {
        const x = coordOn(xScale, annotation.x);
        const y = coordOn(yScale, annotation.y);
        if (Number.isNaN(x) || Number.isNaN(y)) break;
        const node = new Text();
        node.text = annotation.text;
        node.x = x;
        node.y = y;
        node.textAlign = 'center';
        node.textBaseline = 'bottom';
        node.fontSize = annotation.fontSize ?? themeFont(theme, FONT_STEP.heading);
        node.fontFamily = theme.fontFamily;
        node.fill = annotation.color ?? theme.foregroundColor;
        layer.append(node);
        break;
      }
      case 'range': {
        const scale = annotation.axis === 'x' ? xScale : yScale;
        const from = resolve(annotation.range[0]);
        const to = resolve(annotation.range[1]);
        if (from === undefined || to === undefined) break;
        const c0 = coordOn(scale, from);
        const c1 = coordOn(scale, to);
        if (Number.isNaN(c0) || Number.isNaN(c1)) break;
        const rect = new Rect();
        if (annotation.axis === 'x') {
          rect.x = Math.min(c0, c1);
          rect.width = Math.abs(c1 - c0);
          rect.y = plot.y;
          rect.height = plot.height;
        } else {
          rect.y = Math.min(c0, c1);
          rect.height = Math.abs(c1 - c0);
          rect.x = plot.x;
          rect.width = plot.width;
        }
        rect.fill = annotation.fill ?? theme.mutedColor;
        rect.opacity = annotation.fillOpacity ?? 0.12;
        layer.append(rect);
        appendLabel(
          layer,
          theme,
          annotation.label,
          annotation.axis === 'x' ? (c0 + c1) / 2 : plot.x + plot.width - 4,
          annotation.axis === 'x' ? plot.y + 12 : Math.min(c0, c1) - 4,
          annotation.axis === 'x' ? 'center' : 'right',
          annotation.fill,
        );
        break;
      }
    }
  }
}

/**
 * The label of a line, with `formatter` given the number the line landed on —
 * that is the whole point of a computed level: "p95 = 214 ms" without anyone
 * typing 214.
 */
function lineLabel(label: LineAnnotationLabel | undefined, value: unknown): AnnotationLabel | undefined {
  if (!label?.formatter || typeof value !== 'number') return label;
  return { ...label, text: label.formatter(value) };
}

function appendLabel(
  layer: Group,
  theme: ThemeContext,
  label: AnnotationLabel | undefined,
  x: number,
  y: number,
  align: CanvasTextAlign,
  accent?: ColorValue,
): void {
  if (!label?.text) return;
  const node = new Text();
  node.text = label.text;
  node.x = x;
  node.y = y;
  node.textAlign = align;
  node.textBaseline = 'bottom';
  node.fontSize = label.fontSize ?? themeFont(theme, FONT_STEP.label);
  node.fontFamily = label.fontFamily ?? theme.fontFamily;
  node.fill = label.color ?? accent ?? theme.foregroundColor;
  layer.append(node);
}

export { isComputedValue, computeStat, resolveValue } from './stats';
export type { AnnotationStat, ComputedAnnotationValue } from './stats';

/** Feature API for widgets (via registry.getFeature('annotations')). */
export const annotationsApi = { render: renderAnnotations };
export type AnnotationsApi = typeof annotationsApi;

export const annotationsModule = { kind: 'feature', name: 'annotations', api: annotationsApi } as const;
