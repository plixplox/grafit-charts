import type { ColorValue } from '@/shared/options';

function parseColor(color: ColorValue): [number, number, number] {
  let hex = color.trim().replace('#', '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const value = Number.parseInt(hex, 16);
  if (Number.isNaN(value) || hex.length !== 6) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Continuous color scale: number → interpolation across stops (hex colors). */
export class ColorScale {
  constructor(
    public domain: [number, number] = [0, 1],
    public colors: ColorValue[] = ['#436ff4', '#f45d8a'],
  ) {}

  convert(value: number): ColorValue {
    const [d0, d1] = this.domain;
    const stops = this.colors.length >= 2 ? this.colors : ['#000', '#fff'];
    const ratio = d1 === d0 ? 0 : Math.max(0, Math.min(1, (value - d0) / (d1 - d0)));
    const scaled = ratio * (stops.length - 1);
    const index = Math.min(stops.length - 2, Math.floor(scaled));
    const t = scaled - index;
    const from = parseColor(stops[index] ?? '#000');
    const to = parseColor(stops[index + 1] ?? '#fff');
    const mix = from.map((channel, i) => Math.round(channel + ((to[i] ?? 0) - channel) * t));
    return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
  }
}
