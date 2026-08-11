/**
 * Options API primitives. Branded aliases make signatures
 * self-documenting and leave a hook for future validation.
 */
export type ColorValue = string;
export type Fraction = number;
export type Pixels = number;
export type Degrees = number;
/** A share of the room a length is measured against, written CSS-style: `'40%'`. */
export type Percentage = `${number}%`;
/** A length in pixels, or a percentage of the room the option is measured against. */
export type Length = Pixels | Percentage;

export interface Switchable {
  enabled?: boolean;
}

export interface Showable {
  visible?: boolean;
}

export interface FillStyle {
  fill?: ColorValue;
  fillOpacity?: Fraction;
}

export interface StrokeStyle {
  stroke?: ColorValue;
  strokeWidth?: Pixels;
  strokeOpacity?: Fraction;
  lineDash?: Pixels[];
  lineDashOffset?: Pixels;
}

export type FontStyle = 'normal' | 'italic' | 'oblique';
export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number;

export interface FontOptions {
  fontSize?: Pixels;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  color?: ColorValue;
}

/** Shared by every value label: what to do when labels run into each other. */
export interface LabelOverlapOptions {
  /**
   * Drop a label whose box runs into one already drawn (default false — every
   * label is drawn). Marks keep their own order, so of two labels fighting for
   * the same spot the earlier datum wins.
   */
  avoidOverlap?: boolean;
}

/**
 * Labels of a series whose marks read as parts of a whole: a pie sector, a
 * funnel stage, a pyramid layer. The two options answer different questions —
 * which parts are worth a label, and whether there is room for the ones that are.
 */
export interface PartLabelOptions extends LabelOverlapOptions {
  /**
   * Drop a label there is no room for (default false). Off, every part gets its
   * label and crowded ones are left to overlap; on, the largest parts ask for
   * room first and the slivers are the ones that lose their labels.
   */
  avoidOverlap?: boolean;
  /**
   * Share of the total a part needs before it is worth labelling, 0..1 (0 by
   * default — every part is). `0.02` reads as "label what is at least two
   * percent" and leaves a long tail of slivers unlabelled, which is usually
   * what makes a crowded chart legible. Combines with avoidOverlap: this
   * decides which parts are worth a label, that one whether there is room for
   * it — of two labels after the same spot the larger part wins.
   */
  minShare?: Fraction;
}

/**
 * What the format of a part name is handed: the whole row and the raw value of
 * the field the name comes from. A name is a field value like any other, and
 * how it becomes text is a property of the series, not of the place it is
 * printed in.
 */
export interface PartNameParams {
  datum: Datum;
  /** Raw value of the name field (labelField/stageField). */
  value: unknown;
}

/** How the two parts of a part label sit together. */
export type PartLabelLayout = 'stacked' | 'inline';

/**
 * The value half of a part label. `type` chooses what the number says: the
 * share of the total, or the value itself.
 */
export interface PartValueLabelOptions<P = unknown> extends Switchable, FontOptions {
  /** 'percent' — share of the total; 'value' — the value field itself. */
  type?: 'percent' | 'value';
  /** Serializable format string (',.2f', '.0%'). */
  format?: string;
  formatter?: (params: P) => string;
}

/**
 * A label made of the part name and its value, drawn as one block so the two
 * always read together: each half carries its own font, `layout` puts the value
 * on its own line or in the same row behind a separator.
 */
export interface PartLabelBlockOptions<P = unknown> extends PartLabelOptions {
  /** 'stacked' — the value on its own line under the name; 'inline' — one row. */
  layout?: PartLabelLayout;
  /** What separates the two halves of an inline label (' · ' by default). */
  separator?: string;
  /** Part name; its own font over the label's, and its own format for the field it comes from. */
  category?: Switchable & FontOptions & Formattable<P>;
  /** Part value; its own font over the label's. */
  value?: PartValueLabelOptions<P>;
}

/**
 * The format/formatter/itemStyler triad: `format` is a serializable string,
 * `formatter` is a function → text. Stylers (function → partial styles)
 * are declared via the Styler type.
 */
export interface Formattable<P> {
  format?: string;
  formatter?: (params: P) => string | undefined;
}

export type Styler<P, S> = (params: P) => S | undefined;

export interface Padding {
  top?: Pixels;
  right?: Pixels;
  bottom?: Pixels;
  left?: Pixels;
}

/**
 * Padding in any CSS-like shorthand: a single value, `[all]`,
 * `[vertical, horizontal]`, `[top, right, bottom, left]`, or the named object.
 */
export type PaddingValue = Pixels | [Pixels] | [Pixels, Pixels] | [Pixels, Pixels, Pixels, Pixels] | Padding;

/** Drop shadow of a filled shape. */
export interface ShadowOptions extends Switchable {
  /** 'rgba(0, 0, 0, 0.2)' by default. */
  color?: ColorValue;
  /** Blur radius; 8 by default. */
  blur?: Pixels;
  offsetX?: Pixels;
  /** 2 by default. */
  offsetY?: Pixels;
}

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends Element | Date
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

export type Datum = Record<string, unknown>;
