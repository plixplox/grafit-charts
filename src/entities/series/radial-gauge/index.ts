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
import type { ColorValue, Degrees, Pixels, Switchable } from '@/shared/options';
import { Circle, Group, Line, Sector, Text } from '@/shared/scene';

export interface RadialGaugeSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'radial-gauge';
  value: number;
  scale?: { min?: number; max?: number };
  /** Colored scale segments: the value each color extends to. */
  segments?: GaugeSegment[];
  /** A mark across the ring at the value being aimed at. */
  target?: number;
  /** Color of the target mark (the foreground of the theme by default). */
  targetColor?: ColorValue;
  needle?: Switchable;
  /** The value printed below the hub. */
  label?: GaugeLabelOptions;
  /** The two ends of the scale, printed outside the arc. */
  ticks?: GaugeLabelOptions;
  startAngle?: Degrees;
  endAngle?: Degrees;
  thickness?: Pixels;
}

/** Room between the arc and the labels of its bounds. */
const TICK_GAP = 10;
/** The value label rides below the hub, at this share of the radius. */
const LABEL_OFFSET = 0.42;
/** Breathing room around the whole dial. */
const PAD = 4;

interface DialBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class RadialGaugeSeries extends StandaloneSeries<RadialGaugeSeriesOptions> {
  readonly type = 'radial-gauge';

  private get bounds(): { min: number; max: number } {
    return { min: this.options.scale?.min ?? 0, max: this.options.scale?.max ?? 100 };
  }

  update(ctx: StandaloneRenderContext): void {
    this.lastCtx = ctx;
    this.hits = [];
    if (!this.visible) return;
    const { min, max } = this.bounds;
    const t = ctx.animationT ?? 1;
    const startAngle = (((this.options.startAngle ?? -110) + 360) % 360) * (Math.PI / 180) - Math.PI * 2;
    const endAngle = ((this.options.endAngle ?? 110) * Math.PI) / 180;
    const sweep = endAngle - startAngle;
    const { radius, centerX, centerY, box } = this.fit(ctx, startAngle, endAngle);
    const thickness = this.options.thickness ?? Math.max(10, radius * 0.18);
    const value = Math.max(min, Math.min(max, this.options.value));
    const ratio = max === min ? 0 : ((value - min) / (max - min)) * t;
    const group = new Group();

    // scale background or segments
    const segments = this.options.segments;
    if (segments?.length) {
      let from = startAngle;
      for (const segment of segments) {
        const segRatio = Math.max(0, Math.min(1, (segment.to - min) / (max - min)));
        const to = startAngle + sweep * segRatio;
        const arc = new Sector();
        arc.centerX = centerX;
        arc.centerY = centerY;
        arc.innerRadius = radius - thickness;
        arc.outerRadius = radius;
        arc.startAngle = from;
        arc.endAngle = to;
        arc.fill = segment.color;
        arc.opacity = 0.9;
        group.append(arc);
        from = to;
      }
    } else {
      const track = new Sector();
      track.centerX = centerX;
      track.centerY = centerY;
      track.innerRadius = radius - thickness;
      track.outerRadius = radius;
      track.startAngle = startAngle;
      track.endAngle = endAngle;
      track.fill = this.env.theme.mutedColor;
      track.opacity = 0.2;
      group.append(track);

      const bar = new Sector();
      bar.centerX = centerX;
      bar.centerY = centerY;
      bar.innerRadius = radius - thickness;
      bar.outerRadius = radius;
      bar.startAngle = startAngle;
      bar.endAngle = startAngle + sweep * ratio;
      bar.fill = this.colorFor(0);
      group.append(bar);
    }

    if (this.options.needle?.enabled !== false) {
      const angle = startAngle + sweep * ratio;
      const needle = new Line();
      needle.x1 = centerX;
      needle.y1 = centerY;
      needle.x2 = centerX + Math.sin(angle) * (radius - thickness - 6);
      needle.y2 = centerY - Math.cos(angle) * (radius - thickness - 6);
      needle.stroke = this.env.theme.foregroundColor;
      needle.strokeWidth = 2.5;
      group.append(needle);
      const cap = new Circle();
      cap.x = centerX;
      cap.y = centerY;
      cap.radius = 5;
      cap.fill = this.env.theme.foregroundColor;
      group.append(cap);
    }

    if (this.options.target !== undefined) {
      const targetRatio = Math.max(0, Math.min(1, (this.options.target - min) / (max - min)));
      const angle = startAngle + sweep * targetRatio;
      const overhang = Math.max(3, thickness * 0.25);
      const inner = radius - thickness - overhang;
      const outer = radius + overhang;
      const target = new Line();
      target.x1 = centerX + Math.sin(angle) * inner;
      target.y1 = centerY - Math.cos(angle) * inner;
      target.x2 = centerX + Math.sin(angle) * outer;
      target.y2 = centerY - Math.cos(angle) * outer;
      target.stroke = this.options.targetColor ?? this.env.theme.foregroundColor;
      target.strokeWidth = 2;
      group.append(target);
    }

    if (this.options.label?.enabled !== false) {
      const label = new Text();
      label.text = this.labelText();
      label.x = centerX;
      label.y = centerY + radius * LABEL_OFFSET;
      label.textAlign = 'center';
      label.textBaseline = 'middle';
      styleGaugeText(label, this.labelStyle(radius));
      group.append(label);
    }

    if (this.options.ticks?.enabled !== false) {
      const style = this.tickStyle();
      for (const [bound, angle] of this.boundTicks(startAngle, endAngle)) {
        const tickLabel = new Text();
        tickLabel.text = gaugeLabelText(bound, this.options.ticks);
        tickLabel.x = centerX + Math.sin(angle) * (radius + TICK_GAP);
        tickLabel.y = centerY - Math.cos(angle) * (radius + TICK_GAP);
        tickLabel.textAlign = 'center';
        tickLabel.textBaseline = 'top';
        styleGaugeText(tickLabel, style);
        group.append(tickLabel);
      }
    }

    this.registerHit(0, centerX + box.minX, centerY + box.minY, box.maxX - box.minX, box.maxY - box.minY);
    ctx.layer.append(group);
  }

  private labelText(): string {
    return gaugeLabelText(this.options.value, this.options.label);
  }

  /** The value reads as the headline of the dial, so it follows the radius. */
  private labelStyle(radius: number): GaugeTextStyle {
    return gaugeTextStyle(
      this.options.label,
      { size: Math.max(16, radius * 0.22), weight: 'bold', color: this.env.theme.foregroundColor },
      this.env.theme,
    );
  }

  private tickStyle(): GaugeTextStyle {
    return gaugeTextStyle(this.options.ticks, { color: this.env.theme.mutedColor }, this.env.theme);
  }

  /** The two labelled ends of the scale, each with the angle it sits at. */
  private boundTicks(startAngle: number, endAngle: number): ReadonlyArray<readonly [number, number]> {
    const { min, max } = this.bounds;
    return [
      [min, startAngle],
      [max, endAngle],
    ];
  }

  /**
   * A dial is an arc, not a circle: an upright one fills the top of its room
   * and leaves the bottom empty. Sizing it against the box the drawing really
   * covers — arc, hub, value, bounds — centers that box in the plot and lets
   * the dial grow into the room a circle would have wasted.
   */
  private fit(
    ctx: StandaloneRenderContext,
    startAngle: number,
    endAngle: number,
  ): { radius: number; centerX: number; centerY: number; box: DialBox } {
    const { plot } = ctx;
    const width = Math.max(1, plot.width - PAD * 2);
    const height = Math.max(1, plot.height - PAD * 2);
    let radius = Math.max(1, Math.min(width, height) / 2);
    let box = this.dialBox(ctx, radius, startAngle, endAngle);
    // the box grows slower than the radius — the labels keep their size — so a
    // few passes settle on the radius whose box just fills the plot
    for (let pass = 0; pass < 4; pass++) {
      const scale = Math.min(width / (box.maxX - box.minX), height / (box.maxY - box.minY));
      if (Math.abs(scale - 1) < 0.005) break;
      radius = Math.max(1, radius * scale);
      box = this.dialBox(ctx, radius, startAngle, endAngle);
    }
    const overflow = Math.min(1, width / (box.maxX - box.minX), height / (box.maxY - box.minY));
    if (overflow < 1) {
      radius = Math.max(1, radius * overflow);
      box = this.dialBox(ctx, radius, startAngle, endAngle);
    }
    const centerX = plot.x + PAD + (width - (box.maxX - box.minX)) / 2 - box.minX;
    const centerY = plot.y + PAD + (height - (box.maxY - box.minY)) / 2 - box.minY;
    return { radius, centerX, centerY, box };
  }

  /** The box a dial of this radius covers, measured from its hub. */
  private dialBox(ctx: StandaloneRenderContext, radius: number, startAngle: number, endAngle: number): DialBox {
    // the hub, where the needle turns, anchors the box at the center
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    const include = (x: number, y: number): void => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };

    // an arc touches its box at its ends and at every quarter turn between them
    const quarter = Math.PI / 2;
    const angles = [startAngle, endAngle];
    for (let angle = Math.ceil(startAngle / quarter) * quarter; angle < endAngle; angle += quarter) angles.push(angle);
    for (const angle of angles) include(Math.sin(angle) * radius, -Math.cos(angle) * radius);

    if (this.options.ticks?.enabled !== false) {
      const tick = this.tickStyle();
      for (const [bound, angle] of this.boundTicks(startAngle, endAngle)) {
        const half = ctx.measureText(gaugeLabelText(bound, this.options.ticks), tick.spec) / 2;
        const x = Math.sin(angle) * (radius + TICK_GAP);
        const y = -Math.cos(angle) * (radius + TICK_GAP);
        include(x - half, y);
        include(x + half, y + tick.size);
      }
    }

    if (this.options.label?.enabled !== false) {
      const label = this.labelStyle(radius);
      const half = ctx.measureText(this.labelText(), label.spec) / 2;
      const y = radius * LABEL_OFFSET;
      include(-half, y - label.size / 2);
      include(half, y + label.size / 2);
    }

    return { minX, maxX, minY, maxY };
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

export const radialGaugeSeriesModule: SeriesModule<RadialGaugeSeriesOptions> = {
  kind: 'series',
  type: 'radial-gauge',
  requiredOptions: ['value'],
  chartKind: 'hierarchy',
  create: (options, env) => new RadialGaugeSeries(options, env),
};
