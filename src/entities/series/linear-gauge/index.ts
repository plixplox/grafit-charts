import { StandaloneSeries, type StandaloneSeriesBaseOptions } from '@/entities/series/base';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { SeriesModule, StandaloneRenderContext, TooltipContentData } from '@/shared/kernel';
import type { Pixels, Switchable } from '@/shared/options';
import { Group, Line, Rect, Text } from '@/shared/scene';

export interface LinearGaugeSeriesOptions extends StandaloneSeriesBaseOptions {
  type: 'linear-gauge';
  value: number;
  scale?: { min?: number; max?: number };
  /** Target mark. */
  target?: number;
  thickness?: Pixels;
  label?: Switchable & { formatter?: (value: number) => string };
}

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
    const thickness = this.options.thickness ?? 16;
    const y = plot.y + plot.height / 2 - thickness / 2;
    const ratio = max === min ? 0 : Math.max(0, Math.min(1, (this.options.value - min) / (max - min))) * t;
    const group = new Group();

    const track = new Rect();
    track.x = plot.x;
    track.y = y;
    track.width = plot.width;
    track.height = thickness;
    track.fill = this.env.theme.mutedColor;
    track.opacity = 0.2;
    track.cornerRadius = thickness / 2;
    group.append(track);

    const bar = new Rect();
    bar.x = plot.x;
    bar.y = y;
    bar.width = plot.width * ratio;
    bar.height = thickness;
    bar.fill = this.colorFor(0);
    bar.cornerRadius = thickness / 2;
    group.append(bar);

    if (this.options.target !== undefined) {
      const targetRatio = Math.max(0, Math.min(1, (this.options.target - min) / (max - min)));
      const target = new Line();
      target.x1 = target.x2 = plot.x + plot.width * targetRatio;
      target.y1 = y - 5;
      target.y2 = y + thickness + 5;
      target.stroke = this.env.theme.foregroundColor;
      target.strokeWidth = 2;
      group.append(target);
    }

    if (this.options.label?.enabled !== false) {
      const label = new Text();
      label.text = this.options.label?.formatter?.(this.options.value) ?? String(this.options.value);
      label.x = plot.x + plot.width / 2;
      label.y = y - 10;
      label.textAlign = 'center';
      label.textBaseline = 'bottom';
      label.fontSize = 15;
      label.fontWeight = 'bold';
      label.fontFamily = this.env.theme.fontFamily;
      label.fill = this.env.theme.foregroundColor;
      group.append(label);
    }

    for (const [bound, align] of [
      [min, 'left'],
      [max, 'right'],
    ] as const) {
      const tick = new Text();
      tick.text = String(bound);
      tick.x = align === 'left' ? plot.x : plot.x + plot.width;
      tick.y = y + thickness + 6;
      tick.textAlign = align;
      tick.textBaseline = 'top';
      tick.fontSize = themeFont(this.env.theme, FONT_STEP.label);
      tick.fontFamily = this.env.theme.fontFamily;
      tick.fill = this.env.theme.mutedColor;
      group.append(tick);
    }

    this.registerHit(0, plot.x, y - 12, plot.width, thickness + 24);
    ctx.layer.append(group);
  }

  override tooltipFor(): TooltipContentData {
    const rendered = this.renderedTooltip();
    if (rendered) return rendered;
    const rows = [{ label: this.options.name ?? 'Value', value: String(this.options.value), color: this.colorFor(0) }];
    if (this.options.target !== undefined) {
      rows.push({ label: 'Target', value: String(this.options.target), color: this.env.theme.foregroundColor });
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
