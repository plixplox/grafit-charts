interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Channels of #rgb, #rrggbb or rgb(r, g, b); undefined for anything else. */
function parseColor(color: string): Rgb | undefined {
  const rgbMatch = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(color);
  if (rgbMatch) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) };
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    if (full.length < 6) return undefined;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  return undefined;
}

/** Contrasting text color based on background luminance: #rgb, #rrggbb or rgb(r, g, b). */
export function contrastTextColor(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return '#ffffff';
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 150 ? '#33404f' : '#ffffff';
}

/**
 * Opaque blend of two colors: `amount` 0 keeps `color`, 1 yields `towards`.
 * Lets a series tint a fill without painting it semi-transparent. Returns
 * `color` untouched when either side is not parseable.
 */
export function mixColors(color: string, towards: string, amount: number): string {
  const from = parseColor(color);
  const to = parseColor(towards);
  if (!from || !to) return color;
  const t = Math.min(1, Math.max(0, amount));
  const channel = (a: number, b: number) =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(from.r, to.r)}${channel(from.g, to.g)}${channel(from.b, to.b)}`;
}
