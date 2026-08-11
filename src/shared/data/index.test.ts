import { computeStacks, numericValues, uniqueValues } from './index';
import { describe, expect, it } from 'vitest';

describe('numericValues', () => {
  it('extracts numbers preserving length; non-numbers yield NaN', () => {
    const data = [{ v: 1 }, { v: 'x' }, {}, { v: Infinity }, { v: -2 }];
    expect(numericValues(data, 'v')).toEqual([1, NaN, NaN, NaN, -2]);
  });
});

describe('uniqueValues', () => {
  it('preserves first-occurrence order', () => {
    const data = [{ c: 'b' }, { c: 'a' }, { c: 'b' }, { c: 'c' }, { c: 'a' }];
    expect(uniqueValues(data, 'c')).toEqual(['b', 'a', 'c']);
  });

  it('compares by SameValueZero: Dates equal in time stay distinct', () => {
    const data = [{ c: new Date(100) }, { c: new Date(100) }];
    expect(uniqueValues(data, 'c')).toHaveLength(2);
  });
});

describe('computeStacks', () => {
  it('cumulative stack: each series starts at the top of the previous one', () => {
    const data = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ];
    const stacks = computeStacks(data, [
      { id: 'A', key: 'a', stackGroup: 'g' },
      { id: 'B', key: 'b', stackGroup: 'g' },
    ]);
    expect(stacks.get('A')).toEqual({ y0: [0, 0], y1: [1, 3] });
    expect(stacks.get('B')).toEqual({ y0: [1, 3], y1: [3, 7] });
  });

  it('diverging: positives and negatives accumulate separately', () => {
    const data = [
      { a: 5, b: 2 },
      { a: -3, b: -4 },
    ];
    const stacks = computeStacks(data, [
      { id: 'A', key: 'a', stackGroup: 'g' },
      { id: 'B', key: 'b', stackGroup: 'g' },
    ]);
    expect(stacks.get('A')).toEqual({ y0: [0, 0], y1: [5, -3] });
    expect(stacks.get('B')).toEqual({ y0: [5, -3], y1: [7, -7] });
  });

  it('non-finite value is treated as 0', () => {
    const stacks = computeStacks([{ a: 'x' }], [{ id: 'A', key: 'a', stackGroup: 'g' }]);
    expect(stacks.get('A')).toEqual({ y0: [0], y1: [0] });
  });

  it('different stackGroups do not interact', () => {
    const stacks = computeStacks(
      [{ a: 1, b: 2 }],
      [
        { id: 'A', key: 'a', stackGroup: 'g1' },
        { id: 'B', key: 'b', stackGroup: 'g2' },
      ],
    );
    expect(stacks.get('B')).toEqual({ y0: [0], y1: [2] });
  });

  it('normalizedTo: the stack top scales to 100', () => {
    const data = [{ a: 3, b: 1 }];
    const stacks = computeStacks(data, [
      { id: 'A', key: 'a', stackGroup: 'g', normalizedTo: 100 },
      { id: 'B', key: 'b', stackGroup: 'g', normalizedTo: 100 },
    ]);
    expect(stacks.get('A')).toEqual({ y0: [0], y1: [75] });
    expect(stacks.get('B')).toEqual({ y0: [75], y1: [100] });
  });

  it('normalizedTo: the negative part scales to −100', () => {
    const data = [{ a: -2, b: -6 }];
    const stacks = computeStacks(data, [
      { id: 'A', key: 'a', stackGroup: 'g', normalizedTo: 100 },
      { id: 'B', key: 'b', stackGroup: 'g', normalizedTo: 100 },
    ]);
    expect(stacks.get('A')).toEqual({ y0: [0], y1: [-25] });
    expect(stacks.get('B')).toEqual({ y0: [-25], y1: [-100] });
  });

  it('normalizedTo: a zero column does not divide by zero', () => {
    const stacks = computeStacks([{ a: 0 }], [{ id: 'A', key: 'a', stackGroup: 'g', normalizedTo: 100 }]);
    expect(stacks.get('A')).toEqual({ y0: [0], y1: [0] });
  });
});
