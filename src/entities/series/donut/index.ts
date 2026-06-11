import { PieLikeSeries, type PieLikeSeriesOptions } from '@/entities/series/base';
import type { PolarRenderContext, SeriesModule } from '@/shared/kernel';
import type { ColorValue, FontOptions, Fraction } from '@/shared/options';
import { Text } from '@/shared/scene';

export interface DonutInnerLabel extends FontOptions {
  text: string;
}

export interface DonutSeriesOptions extends PieLikeSeriesOptions {
  type: 'donut';
  /** Inner radius as a fraction of the outer radius (0.6 by default). */
  innerRadiusRatio?: Fraction;
  /** Text lines in the center of the ring. */
  innerLabels?: DonutInnerLabel[];
  innerCircle?: { fill?: ColorValue };
}

export class DonutSeries extends PieLikeSeries<DonutSeriesOptions> {
  readonly type = 'donut';

  protected innerRadiusRatio(): number {
    return this.options.innerRadiusRatio ?? 0.6;
  }

  override update(ctx: PolarRenderContext): void {
    super.update(ctx);
    const labels = this.options.innerLabels;
    if (!this.visible || !labels?.length) return;
    const lineHeight = 1.3;
    const totalHeight = labels.reduce((sum, label) => sum + (label.fontSize ?? 14) * lineHeight, 0);
    let y = ctx.centerY - totalHeight / 2;
    for (const label of labels) {
      const fontSize = label.fontSize ?? 14;
      const node = new Text();
      node.text = label.text;
      node.x = ctx.centerX;
      node.y = y + fontSize / 2;
      node.textAlign = 'center';
      node.textBaseline = 'middle';
      node.fontSize = fontSize;
      node.fontWeight = label.fontWeight !== undefined ? String(label.fontWeight) : 'normal';
      node.fontFamily = label.fontFamily ?? this.env.theme.fontFamily;
      node.fill = label.color ?? this.env.theme.foregroundColor;
      ctx.layer.append(node);
      y += fontSize * lineHeight;
    }
  }
}

export const donutSeriesModule: SeriesModule<DonutSeriesOptions> = {
  kind: 'series',
  type: 'donut',
  requiredOptions: ['angleField'],
  chartKind: 'polar',
  create: (options, env) => new DonutSeries(options, env),
};
