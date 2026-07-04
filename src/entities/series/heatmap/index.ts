import { CartesianSeries, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues, uniqueValues } from '@/shared/data';
import type { CartesianRenderContext, ColorScaleInfo, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, Pixels, Switchable } from '@/shared/options';
import { BandScale, ColorScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { contrastTextColor, extent } from '@/shared/util';

export interface HeatmapSeriesOptions extends Omit<SeriesBaseOptions, 'tooltip'> {
  type: 'heatmap';
  /** Horizontal category. */
  xField: string;
  /** Vertical category. */
  yField: string;
  /** Numeric value → cell color. */
  colorField: string;
  colorName?: string;
  /** Color scale stops. */
  colorRange?: ColorValue[];
  itemPadding?: Pixels;
  cornerRadius?: Pixels;
  /** Value labels in cells (disabled by default). */
  label?: Switchable &
    FontOptions & {
      /** Placement within the cell (center by default). */
      placement?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      formatter?: (params: { value: number; datum: Datum }) => string;
    };
}

interface CellRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_RANGE = ['#dbe6ff', '#1d4fd7'];

export class HeatmapSeries extends CartesianSeries<HeatmapSeriesOptions> {
  readonly type = 'heatmap';
  private cells: CellRect[] = [];
  private scale = new ColorScale();

  protected mainColor(): ColorValue {
    return this.options.colorRange?.[0] ?? DEFAULT_RANGE[1]!;
  }

  preferredXAxisType(): 'category' {
    return 'category';
  }

  preferredYAxisType(): 'category' {
    return 'category';
  }

  prefersBareAxes(): boolean {
    return true;
  }

  override yDomain(): [number, number] | undefined {
    return undefined;
  }

  yValues(data: Datum[]): unknown[] {
    return uniqueValues(data, this.options.yField);
  }

  colorScaleInfo(): ColorScaleInfo | undefined {
    const values = numericValues(this.lastData, this.options.colorField);
    const domain = extent(values);
    if (!domain) return undefined;
    return { min: domain[0], max: domain[1], colors: this.options.colorRange ?? DEFAULT_RANGE };
  }

  private lastData: Datum[] = [];

  override xValues(data: Datum[]): unknown[] {
    this.lastData = data;
    return data.map((datum) => datum[this.options.xField]);
  }

  override legendItems() {
    return [];
  }

  update(ctx: CartesianRenderContext): void {
    this.lastCtx = ctx;
    this.cells = [];
    if (!this.visible) return;
    const { data, xScale, yScale } = ctx;
    if (!(xScale instanceof BandScale) || !(yScale instanceof BandScale)) {
      throw new Error('grafit: heatmap requires category X and Y axes');
    }
    const values = numericValues(data, this.options.colorField);
    const domain = extent(values.filter((value) => !Number.isNaN(value))) ?? [0, 1];
    this.scale = new ColorScale(domain, this.options.colorRange ?? DEFAULT_RANGE);
    const pad = this.options.itemPadding ?? 2;
    const group = new Group();

    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const x = xScale.convert(datum[this.options.xField]);
      const y = yScale.convert(datum[this.options.yField]);
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      // the cell takes the full band step: only itemPadding sets the gap
      const stepX = xScale.stepSize;
      const stepY = yScale.stepSize;
      const cell: CellRect = {
        index,
        x: x - (stepX - xScale.bandwidth) / 2 + pad / 2,
        y: y - (stepY - yScale.bandwidth) / 2 + pad / 2,
        width: stepX - pad,
        height: stepY - pad,
      };
      this.cells.push(cell);
      const node = new Rect();
      node.x = cell.x;
      node.y = cell.y;
      node.width = cell.width;
      node.height = cell.height;
      node.fill = this.scale.convert(value);
      node.cornerRadius = this.options.cornerRadius ?? 5;
      if (ctx.selected?.has(index)) {
        node.stroke = ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor;
        node.strokeWidth = ctx.selectionStyle?.strokeWidth ?? 1.5;
      }
      if (ctx.selectionActive && !ctx.selected?.has(index)) {
        node.opacity *= ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      }
      group.append(node);

      if (this.options.label?.enabled === true) {
        const label = new Text();
        label.text = this.options.label.formatter ? this.options.label.formatter({ value, datum }) : String(value);
        const placement = this.options.label.placement ?? 'center';
        const inset = 7;
        const horizontal = placement.includes('left') ? 'left' : placement.includes('right') ? 'right' : 'center';
        const vertical = placement.includes('top') ? 'top' : placement.includes('bottom') ? 'bottom' : 'middle';
        label.x = horizontal === 'left' ? cell.x + inset : horizontal === 'right' ? cell.x + cell.width - inset : cell.x + cell.width / 2;
        label.y = vertical === 'top' ? cell.y + inset : vertical === 'bottom' ? cell.y + cell.height - inset : cell.y + cell.height / 2;
        label.textAlign = horizontal;
        label.textBaseline = vertical;
        label.fontSize = this.options.label.fontSize ?? 11;
        label.fontWeight = this.options.label.fontWeight !== undefined ? String(this.options.label.fontWeight) : 'normal';
        label.fontFamily = this.options.label.fontFamily ?? this.env.theme.fontFamily;
        label.fill = this.options.label.color ?? contrastTextColor(node.fill ?? '#000');
        label.outline = node.fill;
        group.append(label);
      }
    });
    group.opacity = ctx.animationT ?? 1;
    ctx.layer.append(group);
  }

  pick(x: number, y: number): SeriesPick | undefined {
    for (const cell of this.cells) {
      if (x >= cell.x && x <= cell.x + cell.width && y >= cell.y && y <= cell.y + cell.height) {
        return {
          seriesId: this.id,
          datumIndex: cell.index,
          distance: 0,
          x: cell.x + cell.width / 2,
          y: cell.y,
          centerX: cell.x + cell.width / 2,
          centerY: cell.y + cell.height / 2,
        };
      }
    }
    return undefined;
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const value = datum[this.options.colorField];
    return {
      heading: `${String(datum[this.options.xField])} · ${String(datum[this.options.yField])}`,
      rows: [
        {
          label: this.options.colorName ?? this.options.colorField,
          value: String(value),
          color: this.scale.convert(Number(value)),
        },
      ],
    };
  }
}

export const heatmapSeriesModule: SeriesModule<HeatmapSeriesOptions> = {
  kind: 'series',
  type: 'heatmap',
  requiredOptions: ['xField', 'yField', 'colorField'],
  chartKind: 'cartesian',
  create: (options, env) => new HeatmapSeries(options, env),
};
