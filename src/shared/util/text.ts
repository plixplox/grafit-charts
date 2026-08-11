/** The mark that stands where a text was cut: two dots leave more room for the text than '…' does. */
export const ELLIPSIS = '..';

/**
 * Text cut to the room it has, with a mark where it was cut. The mark is part
 * of the budget — a label never grows past its room by wearing one — and when
 * not even the mark fits there is nothing honest left to draw.
 */
export function ellipsize(
  text: string,
  font: string,
  room: number,
  measureText: (text: string, font: string) => number,
  mark: string = ELLIPSIS,
): string {
  if (room <= 0) return '';
  if (measureText(text, font) <= room) return text;
  let cut = text.length;
  while (cut > 0 && measureText(`${text.slice(0, cut)}${mark}`, font) > room) cut--;
  // not even one character and the mark fit: the mark alone says the same
  if (cut > 0) return `${text.slice(0, cut)}${mark}`;
  return measureText(mark, font) <= room ? mark : '';
}
