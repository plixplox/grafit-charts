import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import type { LegendItemDescriptor, SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable } from '@/shared/options';
import { Group, Line, Path, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

export interface PyramidSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'pyramid';
  stageField: string;
  valueField: string;
  name?: string;
  /** Bottom-up (apex at the top by default). */
  reverse?: boolean;
  /** Gap between segments (0 by default — solid pyramid). */
  itemSpacing?: Pixels;
  /** Fraction of the plot width used by the shape (0.62 by default); independent of labels. */
  widthRatio?: number;
  /** Labels: outside on the right (by default) or inside with automatic contrast. */
  label?: Switchable &
    FontOptions & {
      placement?: 'inside' | 'outside';
      formatter?: (params: { datum: Datum; stage: string; value: number }) => string;
    };
  /** Line from a segment to its outside label (segment color by default). */
  calloutLine?: Switchable & { length?: Pixels; stroke?: ColorValue; strokeWidth?: Pixels };
}

export class PyramidSeries extends StandaloneSeries<PyramidSeriesOptions> {
  readonly type = 'pyramid';

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    if (!this.visible) return;
    const { data, plot } = ctx;
    const values = numericValues(data, this.options.valueField).map((value) => (Number.isNaN(value) || value < 0 ? 0 : value));
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return;
    const t = ctx.animationT ?? 1;
    // geometry does not depend on labels: the pyramid is always centered
    const centerX = plot.x + plot.width / 2;
    const height = plot.height;
    const maxWidth = plot.width * (this.options.widthRatio ?? 0.62) * t;
    const group = new Group();
    const outsideLabels: Array<{ index: number; text: string; edgeX: number; segmentY: number; labelY: number }> = [];

    // width of the triangle envelope at a relative height (0 is the apex)
    const envelope = (ratio: number) => maxWidth * ratio;
    let cursor = 0;
    data.forEach((datum, index) => {
      const value = values[index] ?? 0;
      if (value <= 0) return;
      const r0 = cursor / total;
      const r1 = (cursor + value) / total;
      cursor += value;
      const flip = this.options.reverse === true;
      const topRatio = flip ? 1 - r0 : r0;
      const bottomRatio = flip ? 1 - r1 : r1;
      const gap = this.options.itemSpacing ?? 0;
      const yTop = plot.y + (flip ? (1 - topRatio) * height : r0 * height) + (index > 0 ? gap / 2 : 0);
      const yBottom = plot.y + (flip ? (1 - bottomRatio) * height : r1 * height) - (index < data.length - 1 ? gap / 2 : 0);
      const widthTop = envelope(flip ? topRatio : r0);
      const widthBottom = envelope(flip ? bottomRatio : r1);

      const path = new Path();
      path.moveTo(centerX - widthTop / 2, yTop);
      path.lineTo(centerX + widthTop / 2, yTop);
      path.lineTo(centerX + widthBottom / 2, yBottom);
      path.lineTo(centerX - widthBottom / 2, yBottom);
      path.closePath();
      path.fill = this.colorFor(index);
      group.append(path);
      const hitWidth = Math.max(widthTop, widthBottom, 40);
      this.registerHit(index, centerX - hitWidth / 2, Math.min(yTop, yBottom), hitWidth, Math.abs(yBottom - yTop));

      if (this.options.label?.enabled !== false) {
        const labelOpts = this.options.label;
        const inside = labelOpts?.placement === 'inside';
        const stageName = String(datum[this.options.stageField]);
        const text = labelOpts?.formatter ? labelOpts.formatter({ datum, stage: stageName, value }) : `${stageName} · ${value}`;
        if (inside) {
          const label = new Text();
          label.text = text;
          label.x = centerX;
          label.y = (yTop + yBottom) / 2;
          label.textAlign = 'center';
          label.textBaseline = 'middle';
          label.fontSize = labelOpts?.fontSize ?? 12;
          label.fontWeight = labelOpts?.fontWeight !== undefined ? String(labelOpts.fontWeight) : 'normal';
          label.fontFamily = labelOpts?.fontFamily ?? this.env.theme.fontFamily;
          label.fill = labelOpts?.color ?? contrastTextColor(this.colorFor(index));
          label.outline = this.colorFor(index); // halo in the segment color
          group.append(label);
        } else {
          outsideLabels.push({
            index,
            text,
            edgeX: centerX + (widthTop + widthBottom) / 4, // edge at mid-height
            segmentY: (yTop + yBottom) / 2,
            labelY: (yTop + yBottom) / 2,
          });
        }
      }
    });

    // outside labels: vertical spreading, the line tilts toward the shifted label
    const labelOptions = this.options.label;
    const fontSize = labelOptions?.fontSize ?? 12;
    const minGap = fontSize + 5;
    let previousY = -Infinity;
    for (const entry of outsideLabels) {
      entry.labelY = Math.max(entry.labelY, previousY + minGap);
      previousY = entry.labelY;
    }
    const calloutLength = this.options.calloutLine?.length ?? 14;
    for (const entry of outsideLabels) {
      if (this.options.calloutLine?.enabled !== false) {
        const callout = new Line();
        callout.x1 = entry.edgeX + 3;
        callout.y1 = entry.segmentY;
        callout.x2 = entry.edgeX + 3 + calloutLength;
        callout.y2 = entry.labelY;
        callout.stroke = this.options.calloutLine?.stroke ?? this.colorFor(entry.index);
        callout.strokeWidth = this.options.calloutLine?.strokeWidth ?? 1;
        group.append(callout);
      }
      const label = new Text();
      label.text = entry.text;
      label.x = entry.edgeX + 3 + calloutLength + 5;
      label.y = entry.labelY;
      label.textAlign = 'left';
      label.textBaseline = 'middle';
      label.fontSize = fontSize;
      label.fontWeight = labelOptions?.fontWeight !== undefined ? String(labelOptions.fontWeight) : 'normal';
      label.fontFamily = labelOptions?.fontFamily ?? this.env.theme.fontFamily;
      label.fill = labelOptions?.color ?? this.env.theme.foregroundColor;
      group.append(label);
    }
    ctx.layer.append(group);
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

  override legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false) return [];
    return this.data.map((datum, index) => ({
      seriesId: `${this.id}#${index}`,
      label: String(datum[this.options.stageField]),
      color: this.colorFor(index),
      visible: true,
    }));
  }
}

export const pyramidSeriesModule: SeriesModule<PyramidSeriesOptions> = {
  kind: 'series',
  type: 'pyramid',
  requiredOptions: ['stageField', 'valueField'],
  chartKind: 'hierarchy',
  create: (options, env) => new PyramidSeries(options, env),
};
