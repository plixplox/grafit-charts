/**
 * Options API primitives. Branded aliases make signatures
 * self-documenting and leave a hook for future validation.
 */
export type ColorValue = string;
export type Fraction = number;
export type Pixels = number;
export type Degrees = number;

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
