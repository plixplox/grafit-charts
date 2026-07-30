import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Degrees, Pixels, Switchable } from '@/shared/options';
import { Circle, Group, Line, Sector, Text } from '@/shared/scene';

export interface RadialGaugeSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'radial-gauge';
  value: number;
  scale?: { min?: number; max?: number };
  /** Colored scale segments: the value each color extends to. */
  segments?: Array<{ to: number; color: ColorValue }>;
  needle?: Switchable;
  label?: Switchable & { formatter?: (value: number) => string };
  startAngle?: Degrees;
  endAngle?: Degrees;
  thickness?: Pixels;
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
    const { plot } = ctx;
    const { min, max } = this.bounds;
    const t = ctx.animationT ?? 1;
    const startAngle = (((this.options.startAngle ?? -110) + 360) % 360) * (Math.PI / 180) - Math.PI * 2;
    const endAngle = ((this.options.endAngle ?? 110) * Math.PI) / 180;
    const sweep = endAngle - startAngle;
    const centerX = plot.x + plot.width / 2;
    const centerY = plot.y + plot.height * 0.58;
    const radius = Math.min(plot.width / 2, plot.height * 0.52) - 6;
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

    if (this.options.label?.enabled !== false) {
      const label = new Text();
      label.text = this.options.label?.formatter?.(this.options.value) ?? String(this.options.value);
      label.x = centerX;
      label.y = centerY + radius * 0.42;
      label.textAlign = 'center';
      label.textBaseline = 'middle';
      label.fontSize = Math.max(16, radius * 0.22);
      label.fontWeight = 'bold';
      label.fontFamily = this.env.theme.fontFamily;
      label.fill = this.env.theme.foregroundColor;
      group.append(label);
    }

    for (const [bound, angle] of [
      [min, startAngle],
      [max, endAngle],
    ] as const) {
      const tickLabel = new Text();
      tickLabel.text = String(bound);
      tickLabel.x = centerX + Math.sin(angle) * (radius + 10);
      tickLabel.y = centerY - Math.cos(angle) * (radius + 10);
      tickLabel.textAlign = 'center';
      tickLabel.textBaseline = 'top';
      tickLabel.fontSize = themeFont(this.env.theme, FONT_STEP.label);
      tickLabel.fontFamily = this.env.theme.fontFamily;
      tickLabel.fill = this.env.theme.mutedColor;
      group.append(tickLabel);
    }

    this.registerHit(0, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.layer.append(group);
  }

  override tooltipFor(): TooltipContentData {
    return { rows: [{ label: 'Value', value: String(this.options.value), color: this.colorFor(0) }] };
  }
}

export const radialGaugeSeriesModule: SeriesModule<RadialGaugeSeriesOptions> = {
  kind: 'series',
  type: 'radial-gauge',
  requiredOptions: ['value'],
  chartKind: 'hierarchy',
  create: (options, env) => new RadialGaugeSeries(options, env),
};
