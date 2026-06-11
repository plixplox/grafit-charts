/** Contrasting text color based on background luminance: #rgb, #rrggbb or rgb(r, g, b). */
export function contrastTextColor(background: string): string {
  let r = 0;
  let g = 0;
  let b = 0;
  const rgbMatch = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(background);
  if (rgbMatch) {
    r = Number(rgbMatch[1]);
    g = Number(rgbMatch[2]);
    b = Number(rgbMatch[3]);
  } else if (background.startsWith('#')) {
    const hex = background.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    r = parseInt(full.slice(0, 2), 16);
    g = parseInt(full.slice(2, 4), 16);
    b = parseInt(full.slice(4, 6), 16);
  } else {
    return '#ffffff';
  }
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#33404f' : '#ffffff';
}
