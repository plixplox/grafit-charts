import { CartesianSeries } from './cartesian-series';
import type { LabelFont } from './rect-label';
import { numericValues } from '@/shared/data';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type {
  CartesianGeometry,
  CartesianRenderContext,
  Insets,
  LabelOverflowContext,
  LegendItemDescriptor,
  SeriesPick,
  TooltipContentData,
} from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable, Showable } from '@/shared/options';
import { Group, Line, Path, Rect, Text } from '@/shared/scene';
import { contrastTextColor, maxOverflow, overflowOutside, textBounds, NO_OVERFLOW } from '@/shared/util';

export interface FunnelSeriesBaseOptions extends Showable {
  id?: string;
  /** Stage name. */
  stageField: string;
  /** Stage value. */
  valueField: string;
  name?: string;
  fills?: ColorValue[];
  showInLegend?: boolean;
  /** Gap between segments (4 by default). */
  itemSpacing?: Pixels;
  /** Fraction of the plot width used by the shape (0.62 by default); independent of labels. */
  widthRatio?: number;
  /** Labels: inside (auto-contrast) or outside on the right. */
  label?: Switchable &
    FontOptions & {
      placement?: 'inside' | 'outside';
      formatter?: (params: { datum: Datum; stage: string; value: number }) => string;
    };
  /** Line from a segment to its outside label (segment color by default). */
  calloutLine?: Switchable & { length?: Pixels; stroke?: ColorValue; strokeWidth?: Pixels };
}

interface StageGeometry {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StageLayout extends StageGeometry {
  /** Width of the stage below — the lower edge of a trapezoid. */
  nextWidth: number;
  /** Where the callout line leaves the shape. */
  edgeX: number;
  text: string;
}

const DEFAULT_WIDTH_RATIO = 0.62;
const CALLOUT_LENGTH = 14;
/** Gap between the shape edge and the callout line. */
const EDGE_GAP = 3;
/** Gap between the callout line and the text. */
const LABEL_GAP = 5;

/** Base for funnel/cone-funnel: stages top to bottom, width by value, no axes. */
export abstract class FunnelSeriesBase<O extends FunnelSeriesBaseOptions> extends CartesianSeries<O & { xField: string; yField: string }> {
  private stages: StageGeometry[] = [];

  /** Trapezoids between stages (cone) or rectangles (funnel). */
  protected abstract trapezoid(): boolean;

  protected mainColor(): ColorValue {
    return this.colorFor(0);
  }

  protected colorFor(index: number): ColorValue {
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[index % fills.length] ?? this.env.colors.fill;
  }

  hidesAxes(): boolean {
    return true;
  }

  override xValues(data: Datum[]): unknown[] {
    return data.map((datum) => datum[this.options.stageField]);
  }

  override yDomain(): [number, number] | undefined {
    return undefined;
  }

  override legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    const data = this.lastCtx?.data ?? [];
    return data.map((datum, index) => ({
      seriesId: `${this.id}#${index}`,
      label: String(datum[this.options.stageField]),
      color: this.colorFor(index),
      visible: true,
    }));
  }

  /** Font of the stage labels: the options over the theme default. */
  private labelFontOf(): LabelFont {
    const label = this.options.label;
    return {
      size: label?.fontSize ?? themeFont(this.env.theme, FONT_STEP.heading),
      weight: label?.fontWeight !== undefined ? String(label.fontWeight) : 'normal',
      family: label?.fontFamily ?? this.env.theme.fontFamily,
    };
  }

  private labelTextFor(datum: Datum, value: number): string {
    const stage = String(datum[this.options.stageField]);
    const formatter = this.options.label?.formatter;
    return formatter ? formatter({ datum, stage, value }) : `${stage} · ${value}`;
  }

  /** Distance from the shape edge to the start of an outside label. */
  private calloutReach(): number {
    return EDGE_GAP + (this.options.calloutLine?.length ?? CALLOUT_LENGTH) + LABEL_GAP;
  }

  /**
   * Stages top to bottom. edgeX is where the callout line leaves the shape —
   * the slanted side of a trapezoid is met at mid-height.
   */
  private layoutStages(ctx: CartesianGeometry, t: number): StageLayout[] {
    const { data, plot } = ctx;
    const values = numericValues(data, this.options.valueField).map((value) => (Number.isNaN(value) || value < 0 ? 0 : value));
    const max = Math.max(...values, 0);
    if (max <= 0 || data.length === 0) return [];

    const stageGap = this.options.itemSpacing ?? 4;
    const stageHeight = (plot.height - stageGap * (data.length - 1)) / data.length;
    const widthFactor = this.options.widthRatio ?? DEFAULT_WIDTH_RATIO;
    const centerX = plot.x + plot.width / 2;

    return data.map((datum, index) => {
      const value = values[index] ?? 0;
      const width = (value / max) * plot.width * widthFactor * t;
      const nextWidth = ((values[index + 1] ?? value) / max) * plot.width * widthFactor * t;
      const y = plot.y + index * (stageHeight + stageGap);
      return {
        index,
        x: centerX - width / 2,
        y,
        width,
        height: stageHeight,
        nextWidth,
        edgeX: centerX + (this.trapezoid() ? (width + nextWidth) / 4 : width / 2),
        text: this.labelTextFor(datum, value),
      };
    });
  }

  /**
   * Outside labels read to the right of the shape, so the layout has to keep
   * that column clear of the plot rect — measured on the finished shape (t = 1).
   */
  override labelOverflow(ctx: LabelOverflowContext): Insets {
    const label = this.options.label;
    if (!this.visible || label?.enabled === false || label?.placement !== 'outside') return NO_OVERFLOW;
    const font = this.labelFontOf();
    const fontSpec = `${font.weight} ${font.size}px ${font.family}`;
    const reach = this.calloutReach();
    let overflow = NO_OVERFLOW;
    for (const stage of this.layoutStages(ctx, 1)) {
      const width = ctx.measureText(stage.text, fontSpec);
      const bounds = textBounds(stage.edgeX + reach, stage.y + stage.height / 2, width, font.size, 'left', 'middle');
      overflow = maxOverflow(overflow, overflowOutside(bounds, ctx.plot));
    }
    return overflow;
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.stages = [];
    if (!this.visible) return;
    const { plot } = ctx;
    const centerX = plot.x + plot.width / 2;
    const group = new Group();

    this.layoutStages(ctx, ctx.animationT ?? 1).forEach((layout) => {
      const { index, width, nextWidth, y, height: stageHeight } = layout;
      const stage: StageGeometry = { index, x: layout.x, y, width, height: stageHeight };
      this.stages.push(stage);

      if (this.trapezoid()) {
        const path = new Path();
        path.moveTo(centerX - width / 2, y);
        path.lineTo(centerX + width / 2, y);
        path.lineTo(centerX + nextWidth / 2, y + stageHeight);
        path.lineTo(centerX - nextWidth / 2, y + stageHeight);
        path.closePath();
        path.fill = this.colorFor(index);
        group.append(path);
      } else {
        const node = new Rect();
        node.x = stage.x;
        node.y = y;
        node.width = width;
        node.height = stageHeight;
        node.cornerRadius = 3;
        node.fill = this.colorFor(index);
        group.append(node);
      }

      if (this.options.label?.enabled !== false) {
        const labelOptions = this.options.label;
        // label position is shared by all segments; narrow segments stay readable
        // thanks to a segment-colored outline around the letters
        const outside = labelOptions?.placement === 'outside';
        const font = this.labelFontOf();
        const label = new Text();
        label.text = layout.text;
        // outside label sits next to its segment, connected by a short line
        const calloutLength = this.options.calloutLine?.length ?? CALLOUT_LENGTH;
        if (outside && this.options.calloutLine?.enabled !== false) {
          const callout = new Line();
          callout.x1 = layout.edgeX + EDGE_GAP;
          callout.y1 = y + stageHeight / 2;
          callout.x2 = layout.edgeX + EDGE_GAP + calloutLength;
          callout.y2 = y + stageHeight / 2;
          callout.stroke = this.options.calloutLine?.stroke ?? this.colorFor(index);
          callout.strokeWidth = this.options.calloutLine?.strokeWidth ?? 1;
          group.append(callout);
        }
        label.x = outside ? layout.edgeX + this.calloutReach() : centerX;
        label.y = y + stageHeight / 2;
        label.textAlign = outside ? 'left' : 'center';
        label.textBaseline = 'middle';
        label.fontSize = font.size;
        label.fontWeight = font.weight;
        label.fontFamily = font.family;
        label.fill = labelOptions?.color ?? (outside ? this.env.theme.foregroundColor : contrastTextColor(this.colorFor(index)));
        if (!outside) label.outline = this.colorFor(index); // halo in the segment color
        group.append(label);
      }
    });
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const stage of this.stages) {
      if (x >= stage.x && x <= stage.x + stage.width && y >= stage.y && y <= stage.y + stage.height) {
        return {
          seriesId: this.id,
          datumIndex: stage.index,
          distance: 0,
          x: stage.x + stage.width / 2,
          y: stage.y,
        };
      }
    }
    return undefined;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    return {
      heading: String(datum[this.options.stageField]),
      rows: [
        {
          label: this.options.name ?? this.options.valueField,
          value: String(datum[this.options.valueField]),
          color: this.colorFor(datumIndex),
        },
      ],
    };
  }
}
