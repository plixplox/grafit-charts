import { lerpDatum, planDataTransition } from './data-transition';
import { describe, expect, it } from 'vitest';

describe('lerpDatum', () => {
  it('walks the numeric fields and takes the rest from the target', () => {
    const frame = lerpDatum({ month: 'Jan', value: 10, note: 'old' }, { month: 'Feb', value: 30, note: 'new' }, 0.5);
    expect(frame).toEqual({ month: 'Feb', value: 20, note: 'new' });
  });

  it('a field that is not a finite number on both ends is taken as it is', () => {
    const frame = lerpDatum({ value: Number.NaN, other: '1' }, { value: 30, other: 5 }, 0.5);
    expect(frame).toEqual({ value: 30, other: 5 });
  });
});

describe('planDataTransition by position', () => {
  const from = [
    { month: 'Jan', value: 10 },
    { month: 'Feb', value: 30 },
  ];
  const to = [
    { month: 'Jan', value: 20 },
    { month: 'Feb', value: 50 },
  ];

  it('interpolates row by row', () => {
    const transition = planDataTransition(from, to);
    expect(transition?.(0.5).data).toEqual([
      { month: 'Jan', value: 15 },
      { month: 'Feb', value: 40 },
    ]);
  });

  it('the last frame is the new data itself, not a walk that arrived at it', () => {
    const transition = planDataTransition(from, to);
    expect(transition?.(1).data).toEqual(to);
  });

  it('a different number of rows has no positional match, so there is no transition', () => {
    expect(planDataTransition(from, [...to, { month: 'Mar', value: 5 }])).toBeUndefined();
  });

  it('nothing on either end is nothing to move between', () => {
    expect(planDataTransition([], to)).toBeUndefined();
    expect(planDataTransition(from, [])).toBeUndefined();
  });
});

describe('planDataTransition by key', () => {
  const from = [
    { month: 'Jan', value: 10 },
    { month: 'Feb', value: 30 },
  ];

  it('rows that stayed flow to their new values however the count changed', () => {
    const to = [
      { month: 'Jan', value: 20 },
      { month: 'Feb', value: 30 },
      { month: 'Mar', value: 40 },
    ];
    const frame = planDataTransition(from, to, { key: 'month', valueFields: ['value'] })?.(0.5);
    expect(frame?.data).toEqual([
      { month: 'Jan', value: 15 },
      { month: 'Feb', value: 30 },
      // entering: grows out of zero rather than appearing at full height
      { month: 'Mar', value: 20 },
    ]);
  });

  it('a row that left sinks to zero and keeps its place until it is gone', () => {
    const to = [{ month: 'Jan', value: 10 }];
    const transition = planDataTransition(from, to, { key: 'month', valueFields: ['value'] });
    expect(transition?.(0.5).data).toEqual([
      { month: 'Jan', value: 10 },
      { month: 'Feb', value: 15 },
    ]);
    expect(transition?.(1).data).toEqual(to);
  });

  it('a row that left holds the seat in front of the row that followed it', () => {
    const window = [
      { month: 'Feb', value: 30 },
      { month: 'Mar', value: 40 },
    ];
    const frame = planDataTransition(from, window, { key: 'month', valueFields: ['value'] })?.(0.5);
    expect(frame?.data.map((datum) => datum.month)).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('without a value field to zero, an entering row simply appears where it belongs', () => {
    const to = [...from, { month: 'Mar', value: 40 }];
    const frame = planDataTransition(from, to, { key: 'month' })?.(0.5);
    expect(frame?.data[2]).toEqual({ month: 'Mar', value: 40 });
  });

  it('a key can be read off the row by hand', () => {
    const to = [
      { month: 'Feb', value: 50 },
      { month: 'Jan', value: 20 },
    ];
    const frame = planDataTransition(from, to, { key: (datum) => datum.month })?.(0.5);
    expect(frame?.data).toEqual([
      { month: 'Feb', value: 40 },
      { month: 'Jan', value: 15 },
    ]);
  });

  it('reordered rows are drawn once, in the order the new data has them', () => {
    const to = [
      { month: 'Feb', value: 30 },
      { month: 'Jan', value: 10 },
    ];
    const frame = planDataTransition(from, to, { key: 'month' })?.(0.5);
    expect(frame?.data.map((datum) => datum.month)).toEqual(['Feb', 'Jan']);
  });

  it('a band opens for a row arriving and closes behind one leaving', () => {
    const to = [
      { month: 'Jan', value: 20 },
      { month: 'Mar', value: 40 },
    ];
    const transition = planDataTransition(from, to, { key: 'month', valueFields: ['value'] });
    // Jan stayed, Feb is on its way out, Mar on its way in
    expect(transition?.(0.25).weights).toEqual([1, 0.75, 0.25]);
    expect(transition?.(1).weights).toEqual([1, 1]);
  });

  it('rows matched by position all hold a whole band', () => {
    const to = [
      { month: 'Jan', value: 20 },
      { month: 'Feb', value: 50 },
    ];
    expect(planDataTransition(from, to)?.(0.5).weights).toEqual([1, 1]);
  });

  it('everything replaced at once: the old rows sink while the new ones grow', () => {
    const to = [{ month: 'Mar', value: 40 }];
    const frame = planDataTransition(from, to, { key: 'month', valueFields: ['value'] })?.(0.5);
    expect(frame?.data).toEqual([
      { month: 'Jan', value: 5 },
      { month: 'Feb', value: 15 },
      { month: 'Mar', value: 20 },
    ]);
  });
});
