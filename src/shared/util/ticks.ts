const TICK_MULTIPLIERS = [1, 2, 5, 10];

/** Tick step rounded to 1/2/5×10^n (d3-like algorithm). */
export function tickStep(start: number, stop: number, count: number): number {
  const span = Math.abs(stop - start);
  if (span === 0 || count <= 0) return 1;
  const rawStep = span / count;
  const power = Math.floor(Math.log10(rawStep));
  const base = 10 ** power;
  const error = rawStep / base;
  const multiplier =
    TICK_MULTIPLIERS.find((m, index) => {
      const next = TICK_MULTIPLIERS[index + 1];
      return next === undefined || error <= Math.sqrt(m * next);
    }) ?? 10;
  return multiplier * base;
}

export function ticks(start: number, stop: number, count = 5): number[] {
  if (start === stop) return [start];
  const step = tickStep(start, stop, count);
  const result: number[] = [];
  if (step < 1) {
    // i * 0.1 accumulates FP error (7 * 0.1 = 0.7000000000000001);
    // dividing by the integer inverse yields the closest double to the exact tick
    const inverse = Math.round(1 / step);
    const first = Math.ceil(start * inverse);
    const last = Math.floor(stop * inverse + 1e-9);
    for (let i = first; i <= last; i++) result.push(i / inverse);
  } else {
    const first = Math.ceil(start / step);
    const last = Math.floor(stop / step + 1e-9);
    for (let i = first; i <= last; i++) result.push(i * step);
  }
  return result;
}

/** Extends the domain to "nice" bounds that are multiples of the tick step. */
export function niceExtent(start: number, stop: number, count = 5): [number, number] {
  if (start === stop) return start === 0 ? [0, 1] : [start - Math.abs(start) / 2, stop + Math.abs(stop) / 2];
  const step = tickStep(start, stop, count);
  if (step < 1) {
    const inverse = Math.round(1 / step);
    return [Math.floor(start * inverse) / inverse, Math.ceil(stop * inverse) / inverse];
  }
  return [Math.floor(start / step) * step, Math.ceil(stop / step) * step];
}

export function extent(values: number[]): [number, number] | undefined {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min <= max ? [min, max] : undefined;
}
