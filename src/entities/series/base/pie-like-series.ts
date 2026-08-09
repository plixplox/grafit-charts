import { PolarSeries, type PolarSeriesBaseOptions } from './polar-series';
import { numericValues } from '@/shared/data';
import { DEFAULT_DIM_OPACITY } from '@/shared/kernel';
import { FONT_STEP, themeFont } from '@/shared/kernel';
import type { LegendItemDescriptor, PolarRenderContext, SeriesPick, TooltipContentData } from '@/shared/kernel';
import type { Datum, ColorValue, Degrees, FontOptions, Pixels, Fraction, Switchable } from '@/shared/options';
import { Group, Line, Sector, Text } from '@/shared/scene';
import { contrastTextColor } from '@/shared/util';

export interface PieLikeSeriesOptions extends PolarSeriesBaseOptions {
  /** Key of the value that determines the sector angle. */
  angleField: string;
  angleName?: string;
  /** Key of the sector name (legend, labels, tooltip). */
  labelField?: string;
  fills?: ColorValue[];
  strokes?: ColorValue[];
  /** Initial angle, in degrees. */
  rotation?: Degrees;
  /** Fraction of the available radius used by the chart (0.85 by default). */
  outerRadiusRatio?: Fraction;
  /** Outside labels with a callout line. */
  calloutLabel?: Switchable & FontOptions;
  /**
   * Callout line made of two segments; each is configured separately.
   * By default the color is the sector color.
   */
  calloutLine?: {
    /** Radial segment from the sector. */
    radial?: CalloutSegmentOptions;
    /** Horizontal segment toward the label. */
    horizontal?: CalloutSegmentOptions;
  };
  /** Labels inside sectors (share as a percentage). */
  sectorLabel?: Switchable & FontOptions & { positionRatio?: Fraction };
  /** Sector stroke (none by default; use sectorSpacing for gaps). */
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  /** Angular gap between sectors, in px (at the outer radius). */
  sectorSpacing?: Pixels;
  /** Sector corner radius, in px. */
  cornerRadius?: Pixels;
  /** Values in the legend: "label … value". */
  legendValue?: Switchable & { formatter?: (params: PieTooltipRendererParams) => string };
  tooltip?: Switchable & {
    renderer?: (params: PieTooltipRendererParams) => TooltipContentData | string;
  };
}

export interface PieTooltipRendererParams {
  datum: Datum;
  /** Sector name (labelField). */
  label: string;
  /** Value of angleField. */
  value: unknown;
  color: ColorValue;
}

export interface CalloutSegmentOptions {
  length?: Pixels;
  stroke?: ColorValue;
  strokeWidth?: Pixels;
}

interface SectorGeometry {
  index: number;
  startAngle: number;
  endAngle: number;
  outerRadius: number;
  innerRadius: number;
}

const HIGHLIGHT_POP = 6;
const CALLOUT_LENGTH = 20;
const CALLOUT_TAIL = 20;
/** Gap between the sector edge and the start of the callout line. */
const CALLOUT_SECTOR_GAP = 2;
/** Gap between the end of the tail and the text. */
const CALLOUT_TEXT_GAP = 3;
/** Sectors narrower than this get no callout label. */
const CALLOUT_MIN_SWEEP = 0.12;
/** However long the labels are, the pie keeps this share of the free radius. */
const MIN_CALLOUT_RADIUS_RATIO = 0.35;

/** Shared pie/donut implementation; the difference is innerRadiusRatio and center labels. */
export abstract class PieLikeSeries<O extends PieLikeSeriesOptions = PieLikeSeriesOptions> extends PolarSeries<O> {
  private sectors: SectorGeometry[] = [];
  private center = { x: 0, y: 0 };
  private readonly hiddenSectors = new Set<number>();
  /** Angles of the last render — for animating fraction re-layout. */
  private lastAngles = new Map<number, { start: number; end: number }>();

  toggleItem(index: number): void {
    if (this.hiddenSectors.has(index)) {
      this.hiddenSectors.delete(index);
    } else {
      this.hiddenSectors.add(index);
    }
  }

  protected abstract innerRadiusRatio(): Fraction;

  override needsPolarAxes(): boolean {
    return false;
  }

  protected colorFor(index: number): ColorValue {
    const fills = this.options.fills ?? this.env.theme.palette.fills;
    return fills[index % fills.length] ?? this.env.colors.fill;
  }

  protected labelFor(datum: Datum | undefined, index: number): string {
    if (!datum) return String(index);
    const key = this.options.labelField;
    return key ? String(datum[key]) : String(index);
  }

  update(ctx: PolarRenderContext): void {
    this.lastCtx = ctx;
    this.sectors = [];
    if (!this.visible) return;
    const { data, centerX, centerY, layer } = ctx;
    this.center = { x: centerX, y: centerY };

    const values = numericValues(data, this.options.angleField).map((value, index) =>
      Number.isNaN(value) || value < 0 || this.hiddenSectors.has(index) ? 0 : value,
    );
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return;

    const calloutEnabled = this.options.calloutLabel?.enabled !== false && this.options.labelField !== undefined;
    // 85% of the free space by default, less when the callout labels need the room
    const outerRadius = Math.min(
      ctx.radius * (this.options.outerRadiusRatio ?? 0.85),
      calloutEnabled ? this.calloutFittedRadius(ctx, values, total) : Infinity,
    );
    const innerRadius = outerRadius * this.innerRadiusRatio();
    const t = ctx.animationT ?? 1;
    const rotation = ((this.options.rotation ?? 0) * Math.PI) / 180;
    const highlighted =
      ctx.highlight && (ctx.highlight.allSeries || ctx.highlight.seriesId === this.id) ? ctx.highlight.datumIndex : undefined;

    const group = new Group();
    const callouts: Array<{ index: number; midAngle: number; outerRadius: number; actualOuterRadius: number }> = [];
    const renderedAngles = new Map<number, { start: number; end: number }>();
    let cursor = rotation;
    values.forEach((value, index) => {
      if (value <= 0) return;
      const sweep = (value / total) * Math.PI * 2 * t;
      const fade = ctx.fadeHighlight;
      const isFading = fade !== undefined && (fade.allSeries === true || fade.seriesId === this.id) && fade.datumIndex === index;
      const pop = index === highlighted ? HIGHLIGHT_POP * (ctx.highlightT ?? 1) : isFading ? HIGHLIGHT_POP * (ctx.fadeHighlightT ?? 0) : 0;
      // fraction re-layout (toggle via the legend) animates from the previous layout
      let startAngle = cursor;
      let endAngle = cursor + sweep;
      const transitionT = ctx.transitionT;
      const previousAngles = this.lastAngles.get(index);
      if (transitionT !== undefined && previousAngles) {
        startAngle = previousAngles.start + (startAngle - previousAngles.start) * transitionT;
        endAngle = previousAngles.end + (endAngle - previousAngles.end) * transitionT;
      }
      renderedAngles.set(index, { start: startAngle, end: endAngle });
      const geometry: SectorGeometry = {
        index,
        startAngle,
        endAngle,
        outerRadius: outerRadius + pop,
        innerRadius,
      };
      cursor += sweep;
      this.sectors.push(geometry);

      const node = new Sector();
      const isSelected = ctx.selected?.has(index) === true;
      node.centerX = centerX;
      node.centerY = centerY;
      node.innerRadius = geometry.innerRadius;
      node.outerRadius = isSelected ? geometry.outerRadius + HIGHLIGHT_POP : geometry.outerRadius;
      node.startAngle = geometry.startAngle;
      node.endAngle = geometry.endAngle;
      node.fill = this.colorFor(index);
      node.stroke = isSelected ? (ctx.selectionStyle?.stroke ?? this.env.theme.foregroundColor) : this.options.stroke;
      node.strokeWidth = isSelected
        ? (ctx.selectionStyle?.strokeWidth ?? 1.5)
        : (this.options.strokeWidth ?? this.env.theme.markStrokeWidth ?? 1.5);
      node.cornerRadius = this.options.cornerRadius ?? this.env.theme.cornerRadius ?? 0;
      node.edgeInset = (this.options.sectorSpacing ?? 0) / 2;
      if (ctx.selectionActive && !isSelected) {
        node.opacity = ctx.selectionStyle?.inactiveOpacity ?? 0.45;
      } else if (ctx.highlight && highlighted === undefined) {
        node.opacity = ctx.dimOpacity ?? DEFAULT_DIM_OPACITY;
      }
      group.append(node);

      const midAngle = (geometry.startAngle + geometry.endAngle) / 2;

      if (calloutEnabled && sweep > 0.12) {
        // label layout is based on the base radius (hover only moves the line start)
        callouts.push({ index, midAngle, outerRadius, actualOuterRadius: geometry.outerRadius });
      }

      if (this.options.sectorLabel?.enabled === true && sweep > 0.25) {
        const ratio = this.options.sectorLabel.positionRatio ?? 0.7;
        const at = PolarSeries.pointAt(
          centerX,
          centerY,
          midAngle,
          geometry.innerRadius + (geometry.outerRadius - geometry.innerRadius) * ratio,
        );
        const label = new Text();
        label.text = `${Math.round((value / total) * 100)}%`;
        label.x = at.x;
        label.y = at.y;
        label.textAlign = 'center';
        label.textBaseline = 'middle';
        label.fontSize = this.options.sectorLabel.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
        label.fontFamily = this.options.sectorLabel.fontFamily ?? this.env.theme.fontFamily;
        label.fill = this.options.sectorLabel.color ?? contrastTextColor(this.colorFor(index));
        label.outline = this.colorFor(index);
        group.append(label);
      }
    });
    this.lastAngles = renderedAngles;
    this.renderCallouts(group, callouts, centerX, centerY);
    layer.append(group);
  }

  /**
   * Callout labels read outwards from the pie, so a long name on the side eats
   * into the circle: this is the largest radius at which every label still
   * clears the area. Angles are taken from the finished layout — a radius tied
   * to the entrance animation would make the pie breathe while it grows.
   */
  private calloutFittedRadius(ctx: PolarRenderContext, values: number[], total: number): number {
    const { area, centerX, centerY } = ctx;
    const radial = this.options.calloutLine?.radial?.length ?? CALLOUT_LENGTH;
    const tail = this.options.calloutLine?.horizontal?.length ?? CALLOUT_TAIL;
    const fontSize = this.options.calloutLabel?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
    const font = `normal ${fontSize}px ${this.options.calloutLabel?.fontFamily ?? this.env.theme.fontFamily}`;
    const rotation = ((this.options.rotation ?? 0) * Math.PI) / 180;
    // the label starts where the radial and the tail segments end
    const stem = CALLOUT_SECTOR_GAP + radial;

    let fitted = Infinity;
    let cursor = rotation;
    values.forEach((value, index) => {
      const sweep = (value / total) * Math.PI * 2;
      const midAngle = cursor + sweep / 2;
      cursor += sweep;
      if (value <= 0 || sweep <= CALLOUT_MIN_SWEEP) return;
      const width = ctx.measureText(this.labelFor(this.data[index], index), font);
      const sin = Math.sin(midAngle);
      const cos = Math.cos(midAngle);
      // horizontal: the stem, the tail and the text share the room on their side
      const sideways = sin >= 0 ? area.x + area.width - centerX : centerX - area.x;
      if (Math.abs(sin) > 0.001) {
        fitted = Math.min(fitted, (sideways - tail - CALLOUT_TEXT_GAP - width) / Math.abs(sin) - stem);
      }
      // vertical: the label row itself, at whatever height the elbow sits
      const upright = cos >= 0 ? centerY - area.y : area.y + area.height - centerY;
      if (Math.abs(cos) > 0.001) {
        fitted = Math.min(fitted, (upright - fontSize / 2) / Math.abs(cos) - stem);
      }
    });
    return Math.max(fitted, ctx.radius * MIN_CALLOUT_RADIUS_RATIO);
  }

  /**
   * Callout labels: always two segments with fixed angles.
   * Collisions are resolved by changing the length of the first (radial) segment.
   */
  private renderCallouts(
    group: Group,
    callouts: Array<{ index: number; midAngle: number; outerRadius: number; actualOuterRadius: number }>,
    centerX: number,
    centerY: number,
  ): void {
    if (callouts.length === 0) return;
    const radial = this.options.calloutLine?.radial;
    const horizontal = this.options.calloutLine?.horizontal;
    const fontSize = this.options.calloutLabel?.fontSize ?? themeFont(this.env.theme, FONT_STEP.label);
    const minGap = fontSize + 6;

    const entries = callouts.map((callout) => {
      const elbow = PolarSeries.pointAt(centerX, centerY, callout.midAngle, callout.outerRadius + 2 + (radial?.length ?? CALLOUT_LENGTH));
      return {
        index: callout.index,
        midAngle: callout.midAngle,
        actualOuterRadius: callout.actualOuterRadius,
        minRadius: callout.outerRadius + 4,
        elbow,
        rightSide: Math.sin(callout.midAngle) >= 0,
        labelY: elbow.y,
      };
    });

    // clusters of overlapping labels are centered around the mean of the elbows,
    // then the radial length is adjusted to the label height (the angle is unchanged)
    for (const side of [true, false]) {
      const sideEntries = entries.filter((entry) => entry.rightSide === side).sort((a, b) => a.labelY - b.labelY);
      const clusters: Array<typeof sideEntries> = [];
      for (const entry of sideEntries) {
        const last = clusters[clusters.length - 1];
        const lastEntry = last?.[last.length - 1];
        if (last && lastEntry && entry.elbow.y < lastEntry.labelY + minGap) {
          last.push(entry);
          const mean = last.reduce((sum, item) => sum + item.elbow.y, 0) / last.length;
          last.forEach((item, i) => {
            item.labelY = mean + (i - (last.length - 1) / 2) * minGap;
          });
        } else {
          clusters.push([entry]);
        }
      }
      for (const entry of sideEntries) {
        const cosMid = Math.cos(entry.midAngle);
        if (Math.abs(cosMid) < 0.05) continue;
        const t = Math.max(entry.minRadius, (centerY - entry.labelY) / cosMid);
        entry.elbow = PolarSeries.pointAt(centerX, centerY, entry.midAngle, t);
        entry.labelY = entry.elbow.y;
      }
    }

    for (const entry of entries) {
      const sectorColor = this.colorFor(entry.index);
      const direction = entry.rightSide ? 1 : -1;
      // starts at the current (possibly popped-out) sector edge: on hover
      // the label does not move, only the length of the first line changes
      const from = PolarSeries.pointAt(centerX, centerY, entry.midAngle, entry.actualOuterRadius + 2);

      const radialLine = new Line();
      radialLine.x1 = from.x;
      radialLine.y1 = from.y;
      radialLine.x2 = entry.elbow.x;
      radialLine.y2 = entry.elbow.y;
      radialLine.stroke = radial?.stroke ?? sectorColor;
      radialLine.strokeWidth = radial?.strokeWidth ?? 1;
      group.append(radialLine);

      const endX = entry.elbow.x + (horizontal?.length ?? CALLOUT_TAIL) * direction;
      const tail = new Line();
      tail.x1 = entry.elbow.x;
      tail.y1 = entry.labelY;
      tail.x2 = endX;
      tail.y2 = entry.labelY;
      tail.stroke = horizontal?.stroke ?? radial?.stroke ?? sectorColor;
      tail.strokeWidth = horizontal?.strokeWidth ?? radial?.strokeWidth ?? 1;
      group.append(tail);

      const label = new Text();
      label.text = this.labelFor(this.data[entry.index], entry.index);
      label.fontSize = fontSize;
      label.fontFamily = this.options.calloutLabel?.fontFamily ?? this.env.theme.fontFamily;
      label.fill = this.options.calloutLabel?.color ?? this.env.theme.foregroundColor;
      label.x = endX + (entry.rightSide ? 3 : -3);
      label.y = entry.labelY;
      label.textAlign = entry.rightSide ? 'left' : 'right';
      label.textBaseline = 'middle';
      group.append(label);
    }
  }

  pick(x: number, y: number): SeriesPick | undefined {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    for (const sector of this.sectors) {
      if (radius < sector.innerRadius || radius > sector.outerRadius) continue;
      let a = angle;
      while (a < sector.startAngle) a += Math.PI * 2;
      if (a >= sector.startAngle && a <= sector.endAngle) {
        const mid = (sector.startAngle + sector.endAngle) / 2;
        const anchor = PolarSeries.pointAt(this.center.x, this.center.y, mid, sector.outerRadius * 0.85);
        return { seriesId: this.id, datumIndex: sector.index, distance: 0, x: anchor.x, y: anchor.y };
      }
    }
    return undefined;
  }

  nodeAt(datumIndex: number): SeriesPick | undefined {
    const sector = this.sectors.find((candidate) => candidate.index === datumIndex);
    if (!sector) return undefined;
    const mid = (sector.startAngle + sector.endAngle) / 2;
    const anchor = PolarSeries.pointAt(this.center.x, this.center.y, mid, sector.outerRadius * 0.85);
    return { seriesId: this.id, datumIndex, distance: 0, x: anchor.x, y: anchor.y };
  }

  tooltipFor(datumIndex: number): TooltipContentData {
    const data = this.data;
    const datum = data[datumIndex];
    if (!datum) return { rows: [] };
    const renderer = this.options.tooltip?.renderer;
    if (renderer) {
      const result = renderer({
        datum,
        label: this.labelFor(datum, datumIndex),
        value: datum[this.options.angleField],
        color: this.colorFor(datumIndex),
      });
      return typeof result === 'string' ? { heading: result, rows: [] } : result;
    }
    const values = numericValues(data, this.options.angleField).map((value) => (Number.isNaN(value) || value < 0 ? 0 : value));
    const total = values.reduce((sum, value) => sum + value, 0);
    const value = values[datumIndex] ?? 0;
    const percent = total > 0 ? ` (${Math.round((value / total) * 100)}%)` : '';
    return {
      heading: this.labelFor(datum, datumIndex),
      rows: [
        {
          label: this.options.angleName ?? this.options.angleField,
          value: `${value}${percent}`,
          color: this.colorFor(datumIndex),
        },
      ],
    };
  }

  legendItems(): LegendItemDescriptor[] {
    if (this.options.showInLegend === false || !this.options.labelField) return [];
    const data = this.data;
    return data.map((datum, index) => {
      let value: string | undefined;
      if (this.options.legendValue?.enabled === true) {
        const raw = datum[this.options.angleField];
        value = this.options.legendValue.formatter
          ? this.options.legendValue.formatter({
              datum,
              label: this.labelFor(datum, index),
              value: raw,
              color: this.colorFor(index),
            })
          : String(raw);
      }
      return {
        seriesId: `${this.id}#${index}`,
        label: this.labelFor(datum, index),
        color: this.colorFor(index),
        visible: !this.hiddenSectors.has(index),
        value,
      };
    });
  }
}
