/**
 * The update transition: what the chart draws between the data it had and the
 * data it was just given. Rows are matched — by position, or by a key when the
 * options name one — and every numeric field of a matched pair is walked from
 * the old value to the new one. A key also tells the rows that came and went
 * apart from the rest, so they can grow in and sink out instead of blinking.
 */
import type { Datum } from '@/shared/options';

export interface DataTransitionOptions {
  /** What makes a row the same row across the update; without it rows go by position. */
  key?: string | ((datum: Datum, index: number) => unknown);
  /**
   * Fields the chart reads as values — the ones a bar takes its height from.
   * A row entering starts with these at zero and grows; a row leaving sinks
   * back to zero and is gone. Fields nobody named are set straight away: a
   * category or an x coordinate has no base to grow from.
   */
  valueFields?: readonly string[];
}

/** A frame of an update: the rows to draw, and how much room each of them takes. */
export interface TransitionFrame {
  data: Datum[];
  /**
   * How much of a band each row takes, 0..1, row by row. A row that stayed
   * takes a whole one; one arriving grows into its own, one leaving gives its
   * own up — so the categories around it spread rather than snap.
   */
  weights: number[];
}

/** The frame at factor 0..1; at 1 the new data itself, at full width. */
export type DataTransition = (t: number) => TransitionFrame;

/** One row on its way through the transition. */
interface TransitionStep {
  start: Datum;
  end: Datum;
  /** How its band grows or shrinks over the transition: constant for a row that stayed. */
  weight: (t: number) => number;
}

/**
 * The frames between two sets of rows, or nothing when there is no way to draw
 * one: no key to match rows by and a different number of them, or no rows at
 * all on either end.
 */
export function planDataTransition(
  from: readonly Datum[],
  to: readonly Datum[],
  options: DataTransitionOptions = {},
): DataTransition | undefined {
  if (from.length === 0 || to.length === 0) return undefined;
  const target = [...to];
  const keyOf = keyReader(options.key);

  if (!keyOf) {
    // matched by position: a row is the row that sat there before it
    if (from.length !== to.length) return undefined;
    const steps = target.map((datum, index) => ({ start: from[index] ?? datum, end: datum, weight: FULL }));
    return frameReader(steps, target);
  }

  const steps = mergeByKey(from, target, keyOf, options.valueFields ?? []);
  return frameReader(steps, target);
}

/** Linear interpolation of the numeric fields between two rows. */
export function lerpDatum(from: Datum, to: Datum, t: number): Datum {
  const result: Datum = { ...to };
  for (const key of Object.keys(to)) {
    const a = from[key];
    const b = to[key];
    if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
      result[key] = a + (b - a) * t;
    }
  }
  return result;
}

/** A row that is simply there, all the way through. */
const FULL = () => 1;

/**
 * The last frame is the new data itself, not a walk that happens to have
 * arrived: `a + (b - a) * 1` is only nearly `b`, and a row that leaves has no
 * place in it at all.
 */
function frameReader(steps: TransitionStep[], target: Datum[]): DataTransition {
  return (t) =>
    t >= 1
      ? { data: target, weights: target.map(() => 1) }
      : {
          data: steps.map((step) => lerpDatum(step.start, step.end, t)),
          weights: steps.map((step) => step.weight(t)),
        };
}

function keyReader(key: DataTransitionOptions['key']): ((datum: Datum, index: number) => unknown) | undefined {
  if (typeof key === 'function') return key;
  if (typeof key === 'string') return (datum) => datum[key];
  return undefined;
}

/**
 * Old and new rows woven into the order a frame draws them in: the rows that
 * stayed hold their place, the ones that arrived take theirs, and the ones that
 * left keep the seat they had in front of the row that followed them — a line
 * joins its points in the order it is handed them, so a leaving point put
 * anywhere else would drag the line across the plot on its way out.
 */
function mergeByKey(
  from: readonly Datum[],
  to: readonly Datum[],
  keyOf: (datum: Datum, index: number) => unknown,
  valueFields: readonly string[],
): TransitionStep[] {
  const oldByKey = new Map<unknown, Datum>();
  from.forEach((datum, index) => {
    const key = keyOf(datum, index);
    if (!oldByKey.has(key)) oldByKey.set(key, datum);
  });
  const newIndexByKey = new Map<unknown, number>();
  to.forEach((datum, index) => {
    const key = keyOf(datum, index);
    if (!newIndexByKey.has(key)) newIndexByKey.set(key, index);
  });

  const steps: TransitionStep[] = [];
  const leaving: Datum[] = [];
  const flushLeaving = () => {
    // its band closes as it goes, so the rows beside it spread into the room
    for (const datum of leaving) steps.push({ start: datum, end: collapse(datum, valueFields), weight: (t) => 1 - t });
    leaving.length = 0;
  };
  const admit = (index: number) => {
    const datum = to[index] as Datum;
    const previous = oldByKey.get(keyOf(datum, index));
    if (previous) {
      steps.push({ start: previous, end: datum, weight: FULL });
      return;
    }
    // arriving: it opens a band of its own at the same rate
    steps.push({ start: collapse(datum, valueFields), end: datum, weight: (t) => t });
  };

  let cursor = 0;
  from.forEach((datum, index) => {
    const next = newIndexByKey.get(keyOf(datum, index));
    // gone from the new data — it leaves in front of whichever row follows it
    if (next === undefined) {
      leaving.push(datum);
      return;
    }
    // already drawn: the rows were reordered, and the first place wins
    if (next < cursor) return;
    flushLeaving();
    while (cursor <= next) {
      admit(cursor);
      cursor += 1;
    }
  });
  flushLeaving();
  while (cursor < to.length) {
    admit(cursor);
    cursor += 1;
  }
  return steps;
}

/**
 * The row with its values at the base it grows from. Without a field to zero
 * the row is its own start: it appears where it belongs rather than climbing
 * out of a corner it was never at.
 */
function collapse(datum: Datum, valueFields: readonly string[]): Datum {
  let collapsed: Datum | undefined;
  for (const field of valueFields) {
    if (typeof datum[field] !== 'number' || !Number.isFinite(datum[field])) continue;
    collapsed ??= { ...datum };
    collapsed[field] = 0;
  }
  return collapsed ?? datum;
}
