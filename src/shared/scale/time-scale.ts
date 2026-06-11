import { LinearScale } from './linear-scale';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

const STEPS: Array<{ ms: number; unit: TimeUnit }> = [
  { ms: SECOND, unit: 'second' },
  { ms: 5 * SECOND, unit: 'second' },
  { ms: 15 * SECOND, unit: 'second' },
  { ms: 30 * SECOND, unit: 'second' },
  { ms: MINUTE, unit: 'minute' },
  { ms: 5 * MINUTE, unit: 'minute' },
  { ms: 15 * MINUTE, unit: 'minute' },
  { ms: 30 * MINUTE, unit: 'minute' },
  { ms: HOUR, unit: 'hour' },
  { ms: 3 * HOUR, unit: 'hour' },
  { ms: 6 * HOUR, unit: 'hour' },
  { ms: 12 * HOUR, unit: 'hour' },
  { ms: DAY, unit: 'day' },
  { ms: 2 * DAY, unit: 'day' },
  { ms: WEEK, unit: 'week' },
  { ms: 2 * WEEK, unit: 'week' },
  { ms: MONTH, unit: 'month' },
  { ms: 3 * MONTH, unit: 'month' },
  { ms: 6 * MONTH, unit: 'month' },
  { ms: YEAR, unit: 'year' },
];

export function toTimestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  return NaN;
}

/** Time scale: domain in milliseconds, ticks at calendar boundaries. */
export class TimeScale extends LinearScale {
  /** Unit of the last tick generation — for the default label format. */
  tickUnit: TimeUnit = 'day';

  override convert(value: number): number {
    return super.convert(value);
  }

  override nice(): void {
    // time is not rounded to "nice" numbers — the data defines the bounds
  }

  override ticks(count = 5): number[] {
    const [d0, d1] = this.domain;
    const span = d1 - d0;
    if (span <= 0) return [d0];
    const step = STEPS.find(({ ms }) => span / ms <= count) ?? { ms: YEAR, unit: 'year' as const };
    this.tickUnit = step.unit;

    if (step.unit === 'month' || step.unit === 'year') {
      return this.calendarTicks(d0, d1, step.ms, step.unit);
    }
    const first = Math.ceil(d0 / step.ms) * step.ms;
    const result: number[] = [];
    for (let t = first; t <= d1; t += step.ms) result.push(t);
    return result;
  }

  /** Months/years step calendar-wise, not by a fixed number of ms. */
  private calendarTicks(d0: number, d1: number, ms: number, unit: 'month' | 'year'): number[] {
    const result: number[] = [];
    const start = new Date(d0);
    const cursor =
      unit === 'year'
        ? new Date(Date.UTC(start.getUTCFullYear(), 0, 1))
        : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const stepMonths = Math.max(1, Math.round(ms / MONTH));
    const stepYears = Math.max(1, Math.round(ms / YEAR));
    while (cursor.getTime() < d0) {
      if (unit === 'year') cursor.setUTCFullYear(cursor.getUTCFullYear() + stepYears);
      else cursor.setUTCMonth(cursor.getUTCMonth() + stepMonths);
    }
    while (cursor.getTime() <= d1) {
      result.push(cursor.getTime());
      if (unit === 'year') cursor.setUTCFullYear(cursor.getUTCFullYear() + stepYears);
      else cursor.setUTCMonth(cursor.getUTCMonth() + stepMonths);
    }
    return result;
  }

  /** Default label format for the current tickUnit. */
  formatTick(value: number): string {
    const date = new Date(value);
    switch (this.tickUnit) {
      case 'second':
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      case 'minute':
      case 'hour':
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      case 'day':
      case 'week':
        return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      case 'month':
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      case 'year':
        return String(date.getUTCFullYear());
    }
  }
}
