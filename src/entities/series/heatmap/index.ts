import { CartesianSeries, plotBands, type SeriesBaseOptions } from '@/entities/series/base';
import { numericValues, uniqueValues } from '@/shared/data';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { CartesianRenderContext, ColorScaleInfo, SeriesModule, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { ColorValue, Datum, FontOptions, LabelOverlapOptions, Pixels, Switchable } from '@/shared/options';
import { closestSpan, ColorScale } from '@/shared/scale';
import { Group, Rect, Text } from '@/shared/scene';
import { contrastTextColor, extent, formatValue } from '@/shared/util';

export interface HeatmapSeriesOptions extends SeriesBaseOptions<HeatmapTooltipRendererParams> {
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
    FontOptions &
    LabelOverlapOptions & {
      /** Placement within the cell (center by default). */
      placement?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      /** Serializable format string (',.2f', '.0%'); `formatter` wins over it. */
      format?: string;
      formatter?: (params: HeatmapValueParams) => string;
    };
}

export interface HeatmapValueParams {
  /** Value of colorField. */
  value: number;
  datum: Datum;
}

export interface HeatmapTooltipRendererParams extends HeatmapValueParams {
  /** Value of xField — the horizontal category. */
  xValue: unknown;
  /** Value of yField — the vertical category. */
  yValue: unknown;
  /** Colour the scale gave this cell. */
  color: ColorValue;
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
    return this.options.colorRange?.[0] ?? this.env.theme.palette.sequential[1] ?? DEFAULT_RANGE[1]!;
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
    return { min: domain[0], max: domain[1], colors: this.options.colorRange ?? this.env.theme.palette.sequential };
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
    const { data } = ctx;
    const xBands = plotBands(ctx, 'x', ctx.bandSpan);
    // the vertical categories belong to the heatmap alone, so where that axis is
    // continuous nobody but the series knows how far apart its rows stand
    const yBands = plotBands(ctx, 'y', closestSpan(uniqueValues(data, this.options.yField)));
    const values = numericValues(data, this.options.colorField);
    const domain = extent(values.filter((value) => !Number.isNaN(value))) ?? [0, 1];
    this.scale = new ColorScale(domain, this.options.colorRange ?? this.env.theme.palette.sequential);
    const pad = this.options.itemPadding ?? 2;
    const group = new Group();
    const labels = new Group();

    data.forEach((datum, index) => {
      const value = values[index];
      if (value === undefined || Number.isNaN(value)) return;
      const xBand = xBands.bandOf(datum[this.options.xField]);
      const yBand = yBands.bandOf(datum[this.options.yField]);
      if (!xBand || !yBand) return;
      // the cell takes the full band step: only itemPadding sets the gap
      const cell: CellRect = {
        index,
        x: xBand.start - (xBand.step - xBand.size) / 2 + pad / 2,
        y: yBand.start - (yBand.step - yBand.size) / 2 + pad / 2,
        width: xBand.step - pad,
        height: yBand.step - pad,
      };
      this.cells.push(cell);
      const node = new Rect();
      node.x = cell.x;
      node.y = cell.y;
      node.width = cell.width;
      node.height = cell.height;
      node.fill = this.scale.convert(value);
      node.cornerRadius = this.options.cornerRadius ?? this.env.theme.cornerRadius ?? 5;
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
        label.text = this.labelText(value, datum);
        const placement = this.options.label.placement ?? 'center';
        const inset = 7;
        const horizontal = placement.includes('left') ? 'left' : placement.includes('right') ? 'right' : 'center';
        const vertical = placement.includes('top') ? 'top' : placement.includes('bottom') ? 'bottom' : 'middle';
        label.x = horizontal === 'left' ? cell.x + inset : horizontal === 'right' ? cell.x + cell.width - inset : cell.x + cell.width / 2;
        label.y = vertical === 'top' ? cell.y + inset : vertical === 'bottom' ? cell.y + cell.height - inset : cell.y + cell.height / 2;
        label.textAlign = horizontal;
        label.textBaseline = vertical;
        label.fontSize = this.options.label.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
        label.fontWeight = this.options.label.fontWeight !== undefined ? String(this.options.label.fontWeight) : 'normal';
        label.fontFamily = this.options.label.fontFamily ?? this.env.theme.fontFamily;
        label.fill = this.options.label.color ?? contrastTextColor(node.fill ?? '#000');
        label.outline = node.fill;
        if (this.labelFits(ctx, label, this.options.label.avoidOverlap)) labels.append(label);
      }
    });
    group.opacity = ctx.animationT ?? 1;
    this.appendGroups(ctx, group, labels);
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

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const cell = this.cells.find((candidate) => candidate.index === datumIndex);
    if (!cell) return undefined;
    return {
      seriesId: this.id,
      datumIndex,
      distance: 0,
      x: cell.x + cell.width / 2,
      y: cell.y,
      centerX: cell.x + cell.width / 2,
      centerY: cell.y + cell.height / 2,
    };
  }

  /** Text of a cell label: the formatter, then the format string, then the raw value. */
  private labelText(value: number, datum: Datum): string {
    const label = this.options.label;
    if (label?.formatter) return label.formatter({ value, datum });
    return this.valueText(value);
  }

  /**
   * A value spelled out the way `label.format` asks for. The tooltip reads it
   * too — a format is about the number itself — while `label.formatter` stays
   * with the cell it was written for.
   */
  private valueText(value: number): string {
    const format = this.options.label?.format;
    return format ? formatValue(format, value) : String(value);
  }

  override tooltipFor(datumIndex: number): TooltipContentData {
    const datum = this.lastCtx?.data[datumIndex];
    if (!datum) return { rows: [] };
    const raw = datum[this.options.colorField];
    const value = Number(raw);
    const color = this.scale.convert(value);
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      const result = renderer({
        datum,
        value,
        xValue: datum[this.options.xField],
        yValue: datum[this.options.yField],
        color,
      });
      return typeof result === 'string' ? { heading: result, rows: [] } : result;
    }
    return {
      heading: `${String(datum[this.options.xField])} · ${String(datum[this.options.yField])}`,
      rows: [
        {
          label: this.options.colorName ?? this.options.colorField,
          value: Number.isNaN(value) ? String(raw) : this.valueText(value),
          color,
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
