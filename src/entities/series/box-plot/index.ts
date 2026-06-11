import { CartesianSeries, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import type { CartesianRenderContext, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, Pixels, Fraction } from '@/shared/options';
import { BandScale, LinearScale } from '@/shared/scale';
import { Group, Line, Rect } from '@/shared/scene';
import { extent } from '@/shared/util';

export interface BoxPlotSeriesOptions extends Omit<SeriesBaseOptions, 'yField' | 'name'> {
  type: 'box-plot';
  minField: string;
  q1Field: string;
  medianField: string;
  q3Field: string;
  maxField: string;
  name?: string;
  fill?: ColorValue;
  fillOpacity?: Fraction;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /** Whisker cap width as a fraction of the box width. */
  capLengthRatio?: Fraction;
}

interface BoxGeometry {
  index: number;
  x: number;
  width: number;
  q1: number;
  q3: number;
}

export class BoxPlotSeries extends CartesianSeries<BoxPlotSeriesOptions & { yField: string }> {
  readonly type = 'box-plot';
  private boxes: BoxGeometry[] = [];

  protected mainColor(): ColorValue {
    return this.options.fill ?? this.env.colors.fill;
  }

  protected override get seriesName(): string {
    return this.options.name ?? 'Distribution';
  }

  override occupiesBandSlot(): boolean {
    return true;
  }

  override yDomain(data: Datum[]): [number, number] | undefined {
    return extent([...numericValues(data, this.options.minField), ...numericValues(data, this.options.maxField)]);
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.boxes = [];
    if (!this.visible) return;
    const bandScale = ctx.xScale;
    const valueScale = ctx.yScale;
    if (!(bandScale instanceof BandScale) || !(valueScale instanceof LinearScale)) {
      throw new Error('grafit: box-plot requires a category X axis and a numeric Y axis');
    }
    const stroke = this.options.stroke ?? this.mainColor();
    const strokeWidth = this.options.strokeWidth ?? 1.5;
    const groupIndex = ctx.group?.index ?? 0;
    const groupCount = ctx.group?.count ?? 1;
    const slot = bandScale.bandwidth / groupCount;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;
    const group = new Group();

    ctx.data.forEach((datum, index) => {
      const stats = [
        this.options.minField,
        this.options.q1Field,
        this.options.medianField,
        this.options.q3Field,
        this.options.maxField,
      ].map((key) => Number(datum[key]));
      if (stats.some((value) => Number.isNaN(value))) return;
      const [min, q1, median, q3, max] = stats as [number, number, number, number, number];
      const bandStart = bandScale.convert(datum[this.options.xField]);
      if (Number.isNaN(bandStart)) return;
      const x = bandStart + slot * groupIndex + slot * 0.15;
      const width = slot * 0.7;
      const centerX = x + width / 2;
      const pq1 = valueScale.convert(q1);
      const pq3 = valueScale.convert(q3);
      this.boxes.push({ index, x, width, q1: pq1, q3: pq3 });

      const capWidth = width * (this.options.capLengthRatio ?? 0.5);

      const whisker = new Line();
      whisker.x1 = whisker.x2 = centerX;
      whisker.y1 = valueScale.convert(min);
      whisker.y2 = valueScale.convert(max);
      whisker.stroke = stroke;
      whisker.strokeWidth = strokeWidth;
      group.append(whisker);

      for (const value of [min, max]) {
        const cap = new Line();
        cap.x1 = centerX - capWidth / 2;
        cap.x2 = centerX + capWidth / 2;
        cap.y1 = cap.y2 = valueScale.convert(value);
        cap.stroke = stroke;
        cap.strokeWidth = strokeWidth;
        group.append(cap);
      }

      const box = new Rect();
      box.x = x;
      box.y = Math.min(pq1, pq3);
      box.width = width;
      box.height = Math.abs(pq3 - pq1);
      box.fill = this.mainColor();
      box.opacity = this.options.fillOpacity ?? 0.45;
      box.stroke = stroke;
      box.strokeWidth = index === highlighted ? 2 : strokeWidth;
      box.cornerRadius = 2;
      group.append(box);

      const medianLine = new Line();
      medianLine.x1 = x;
      medianLine.x2 = x + width;
      medianLine.y1 = medianLine.y2 = valueScale.convert(median);
      medianLine.stroke = stroke;
      medianLine.strokeWidth = strokeWidth + 0.5;
      group.append(medianLine);
    });

    if (ctx.highlight && ctx.highlight.seriesId !== this.id) group.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
    group.opacity *= ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const box of this.boxes) {
      const top = Math.min(box.q1, box.q3);
      const bottom = Math.max(box.q1, box.q3);
      if (x >= box.x && x <= box.x + box.width && y >= top && y <= bottom) {
        return { seriesId: this.id, datumIndex: box.index, distance: 0, x: box.x + box.width / 2, y: top };
      }
    }
    return undefined;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const color = this.mainColor();
    return {
      heading: String(datum[this.options.xField]),
      rows: [
        { label: 'max', value: String(datum[this.options.maxField]), color },
        { label: 'q3', value: String(datum[this.options.q3Field]), color },
        { label: 'median', value: String(datum[this.options.medianField]), color },
        { label: 'q1', value: String(datum[this.options.q1Field]), color },
        { label: 'min', value: String(datum[this.options.minField]), color },
      ],
    };
  }
}

export const boxPlotSeriesModule: SeriesModule<BoxPlotSeriesOptions> = {
  kind: 'series',
  type: 'box-plot',
  requiredOptions: ['xField', 'minField', 'q1Field', 'medianField', 'q3Field', 'maxField'],
  chartKind: 'cartesian',
  create: (options, env) => new BoxPlotSeries(options as BoxPlotSeriesOptions & { yField: string }, env),
};
