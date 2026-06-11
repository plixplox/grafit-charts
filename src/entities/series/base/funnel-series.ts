import { CartesianSeries } from './cartesian-series';
import { numericValues } from '@/shared/data';
import type { CartesianRenderContext, LegendItemDescriptor, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable, Showable } from '@/shared/options';
import { Group, Line, Path, Rect, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

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

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.stages = [];
    if (!this.visible) return;
    const { data, plot } = ctx;
    const values = numericValues(data, this.options.valueField).map((value) => (Number.isNaN(value) || value < 0 ? 0 : value));
    const max = Math.max(...values, 0);
    if (max <= 0 || data.length === 0) return;

    const t = ctx.animationT ?? 1;
    const stageGap = this.options.itemSpacing ?? 4;
    const stageHeight = (plot.height - stageGap * (data.length - 1)) / data.length;
    // geometry does not depend on labels (like pie): the shape is always centered,
    // the width is a fixed fraction; labels take the remaining space
    const widthFactor = this.options.widthRatio ?? 0.62;
    const centerX = plot.x + plot.width / 2;
    const group = new Group();

    data.forEach((datum, index) => {
      const value = values[index] ?? 0;
      const width = (value / max) * plot.width * widthFactor * t;
      const y = plot.y + index * (stageHeight + stageGap);
      const stage: StageGeometry = { index, x: centerX - width / 2, y, width, height: stageHeight };
      this.stages.push(stage);

      const nextValue = values[index + 1] ?? value;
      const nextWidth = (nextValue / max) * plot.width * widthFactor * t;
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
        const stageName = String(datum[this.options.stageField]);
        const text = labelOptions?.formatter ? labelOptions.formatter({ datum, stage: stageName, value }) : `${stageName} · ${value}`;
        // label position is shared by all segments; narrow segments stay readable
        // thanks to a segment-colored outline around the letters
        const outside = labelOptions?.placement === 'outside';
        const label = new Text();
        label.text = text;
        // outside label sits next to its segment, connected by a short line
        // for a trapezoid the line starts from the slanted edge at mid-height
        const edgeX = centerX + (this.trapezoid() ? (width + nextWidth) / 4 : width / 2);
        const calloutLength = this.options.calloutLine?.length ?? 14;
        const labelX = edgeX + 3 + calloutLength + 5;
        if (outside && this.options.calloutLine?.enabled !== false) {
          const callout = new Line();
          callout.x1 = edgeX + 3;
          callout.y1 = y + stageHeight / 2;
          callout.x2 = edgeX + 3 + calloutLength;
          callout.y2 = y + stageHeight / 2;
          callout.stroke = this.options.calloutLine?.stroke ?? this.colorFor(index);
          callout.strokeWidth = this.options.calloutLine?.strokeWidth ?? 1;
          group.append(callout);
        }
        label.x = outside ? labelX : centerX;
        label.y = y + stageHeight / 2;
        label.textAlign = outside ? 'left' : 'center';
        label.textBaseline = 'middle';
        label.fontSize = labelOptions?.fontSize ?? 12;
        label.fontWeight = labelOptions?.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
        label.fontFamily = labelOptions?.fontFamily ?? this.env.theme.fontFamily;
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
