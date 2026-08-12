import {
  gaugeLabelText,
  gaugeTextStyle,
  styleGaugeText,
  StandaloneSeries,
  type GaugeLabelOptions,
  type GaugeSegment,
  type GaugeTextStyle,
  type StandaloneSeriesBaseOptions,
} from '@/entities/series/base';
import type { SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Pixels } from '@/shared/options';
import { Group, Line, Rect, Text } from '@/shared/scene';

export interface LinearGaugeSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'linear-gauge';
  value: number;
  scale?: { min?: number; max?: number };
  /** Which way the scale runs (horizontal by default). */
  orientation?: 'horizontal' | 'vertical';
  /** Target mark. */
  target?: number;
  /** Color of the target mark (the foreground of the theme by default). */
  targetColor?: ColorValue;
  /**
   * Colored scale segments: the value each color extends to. With segments the
   * track carries the qualitative ranges and the value rides over them as a
   * thinner bar, the way a bullet chart reads.
   */
  segments?: GaugeSegment[];
  thickness?: Pixels;
  /** The value printed beside the bar. */
  label?: GaugeLabelOptions;
  /** The two ends of the scale, printed along the track. */
  ticks?: GaugeLabelOptions;
}

/** Room between the bar and the value beside it. */
const LABEL_GAP = 10;
/** Room between the bar and the labels of its bounds. */
const TICK_GAP = 6;
/** Share of the thickness the value bar keeps when segments hold the track. */
const BULLET_SHARE = 0.45;

export class LinearGaugeSeries extends StandaloneSeries<LinearGaugeSeriesOptions> {
  readonly type = 'linear-gauge';

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    if (!this.visible) return;
    const { plot } = ctx;
    const min = this.options.scale?.min ?? 0;
    const max = this.options.scale?.max ?? 100;
    const t = ctx.animationT ?? 1;
    const vertical = this.options.orientation === 'vertical';
    // a bar left at a fixed size reads as a hairline in a big tile: unless
    // asked for one, it takes a share of the room across its own direction
    const across = vertical ? plot.width : plot.height;
    const thickness = this.options.thickness ?? Math.max(14, Math.min(36, across * 0.14));
    const labelStyle = this.labelStyle(thickness);
    const tickStyle = this.tickStyle();
    const labelBlock = this.options.label?.enabled === false ? 0 : labelStyle.size + LABEL_GAP;
    const ticksShown = this.options.ticks?.enabled !== false;
    const ratio = max === min ? 0 : Math.max(0, Math.min(1, (this.options.value - min) / (max - min))) * t;
    const group = new Group();

    // value, bar and bounds are one block — laying out the block, not the bar,
    // is what keeps the room around it even
    let x: number;
    let y: number;
    let length: number;
    let block: { x: number; y: number; width: number; height: number };
    if (vertical) {
      const tickRoom = ticksShown ? TICK_GAP + this.tickRoom(ctx, tickStyle) : 0;
      // the bounds sit level with the ends of the bar, so half a line of them
      // hangs past each end and the bar stops short of the plot by that much
      const tickHang = ticksShown ? tickStyle.size / 2 : 0;
      length = Math.max(1, plot.height - labelBlock - tickHang * 2);
      x = plot.x + Math.max(0, (plot.width - (thickness + tickRoom)) / 2);
      y = plot.y + labelBlock + tickHang;
      block = { x, y: y - labelBlock, width: thickness + tickRoom, height: labelBlock + length };
    } else {
      const blockHeight = labelBlock + thickness + (ticksShown ? TICK_GAP + tickStyle.size : 0);
      length = plot.width;
      x = plot.x;
      y = plot.y + Math.max(0, (plot.height - blockHeight) / 2) + labelBlock;
      block = { x, y: y - labelBlock, width: length, height: blockHeight };
    }
    /** A rect covering the stretch of the scale between two ratios. */
    const span = (from: number, to: number, width = thickness): Rect => {
      const rect = new Rect();
      const offset = (thickness - width) / 2;
      if (vertical) {
        rect.x = x + offset;
        rect.y = y + length * (1 - to);
        rect.width = width;
        rect.height = length * (to - from);
      } else {
        rect.x = x + length * from;
        rect.y = y + offset;
        rect.width = length * (to - from);
        rect.height = width;
      }
      return rect;
    };

    const segments = this.options.segments;
    if (segments?.length) {
      let from = 0;
      for (const segment of segments) {
        const to = max === min ? 1 : Math.max(0, Math.min(1, (segment.to - min) / (max - min)));
        if (to <= from) continue;
        const stretch = span(from, to);
        stretch.fill = segment.color;
        stretch.opacity = 0.9;
        group.append(stretch);
        from = to;
      }
    } else {
      const track = span(0, 1);
      track.fill = this.env.theme.mutedColor;
      track.opacity = 0.2;
      track.cornerRadius = thickness / 2;
      group.append(track);
    }

    const barWidth = segments?.length ? thickness * BULLET_SHARE : thickness;
    const bar = span(0, ratio, barWidth);
    bar.fill = this.colorFor(0);
    bar.cornerRadius = barWidth / 2;
    group.append(bar);

    if (this.options.target !== undefined) {
      const targetRatio = max === min ? 0 : Math.max(0, Math.min(1, (this.options.target - min) / (max - min)));
      const overhang = Math.max(4, thickness * 0.28);
      const target = new Line();
      if (vertical) {
        const at = y + length * (1 - targetRatio);
        target.x1 = x - overhang;
        target.x2 = x + thickness + overhang;
        target.y1 = target.y2 = at;
      } else {
        const at = x + length * targetRatio;
        target.x1 = target.x2 = at;
        target.y1 = y - overhang;
        target.y2 = y + thickness + overhang;
      }
      target.stroke = this.options.targetColor ?? this.env.theme.foregroundColor;
      target.strokeWidth = 2;
      group.append(target);
    }

    if (this.options.label?.enabled !== false) {
      const label = new Text();
      label.text = gaugeLabelText(this.options.value, this.options.label);
      label.x = vertical ? x + thickness / 2 : x + length / 2;
      label.y = y - LABEL_GAP;
      label.textAlign = 'center';
      label.textBaseline = 'bottom';
      styleGaugeText(label, labelStyle);
      group.append(label);
    }

    if (ticksShown) {
      for (const [bound, at] of [
        [min, 0],
        [max, 1],
      ] as const) {
        const tick = new Text();
        tick.text = gaugeLabelText(bound, this.options.ticks);
        if (vertical) {
          tick.x = x + thickness + TICK_GAP;
          tick.y = y + length * (1 - at);
          tick.textAlign = 'left';
          tick.textBaseline = 'middle';
        } else {
          tick.x = x + length * at;
          tick.y = y + thickness + TICK_GAP;
          tick.textAlign = at === 0 ? 'left' : 'right';
          tick.textBaseline = 'top';
        }
        styleGaugeText(tick, tickStyle);
        group.append(tick);
      }
    }

    this.registerHit(0, block.x, block.y, block.width, block.height);
    ctx.layer.append(group);
  }

  /** The value reads as the headline of the gauge, so it follows the bar. */
  private labelStyle(thickness: number): GaugeTextStyle {
    return gaugeTextStyle(
      this.options.label,
      { size: Math.max(15, Math.min(28, thickness * 0.9)), weight: 'bold', color: this.env.theme.foregroundColor },
      this.env.theme,
    );
  }

  private tickStyle(): GaugeTextStyle {
    return gaugeTextStyle(this.options.ticks, { color: this.env.theme.mutedColor }, this.env.theme);
  }

  /** Width the bound labels take beside a vertical bar. */
  private tickRoom(ctx: StandaloneRenderContext, style: GaugeTextStyle): number {
    const min = this.options.scale?.min ?? 0;
    const max = this.options.scale?.max ?? 100;
    return Math.max(
      ctx.measureText(gaugeLabelText(min, this.options.ticks), style.spec),
      ctx.measureText(gaugeLabelText(max, this.options.ticks), style.spec),
    );
  }

  override tooltipFor(): TooltipContentData {
    const rendered = this.renderedTooltip();
    if (rendered) return rendered;
    const rows = [{ label: this.options.name ?? 'Value', value: String(this.options.value), color: this.colorFor(0) }];
    if (this.options.target !== undefined) {
      rows.push({
        label: 'Target',
        value: String(this.options.target),
        color: this.options.targetColor ?? this.env.theme.foregroundColor,
      });
    }
    return { rows };
  }
}

export const linearGaugeSeriesModule: SeriesModule<LinearGaugeSeriesOptions> = {
  kind: 'series',
  type: 'linear-gauge',
  requiredOptions: ['value'],
  chartKind: 'hierarchy',
  create: (options, env) => new LinearGaugeSeries(options, env),
};
