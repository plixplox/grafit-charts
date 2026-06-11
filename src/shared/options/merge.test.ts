import { deepMerge } from './merge';
import { describe, expect, it } from 'vitest';

describe('deepMerge', () => {
  it('merges nested plain objects recursively', () => {
    const base = { axis: { label: { fontSize: 12, color: 'black' }, line: true } };
    const result = deepMerge(base, { axis: { label: { color: 'red' } } });
    expect(result).toEqual({ axis: { label: { fontSize: 12, color: 'red' }, line: true } });
  });

  it('replaces arrays wholesale', () => {
    const result = deepMerge({ series: [{ type: 'line' }, { type: 'bar' }] }, { series: [{ type: 'area' }] });
    expect(result.series).toEqual([{ type: 'area' }]);
  });

  it('replaces functions wholesale', () => {
    const next = () => 2;
    const result = deepMerge({ formatter: () => 1 }, { formatter: next });
    expect(result.formatter).toBe(next);
  });

  it('skips undefined values in the patch', () => {
    expect(deepMerge({ width: 640 }, { width: undefined })).toEqual({ width: 640 });
  });

  it('does not mutate base', () => {
    const base = { axis: { grid: true } };
    deepMerge(base, { axis: { grid: false } });
    expect(base.axis.grid).toBe(true);
  });

  it('replaces non-plain values (Date, instances) instead of merging', () => {
    const next = new Date(2025, 0, 1);
    const result = deepMerge({ from: new Date(2024, 0, 1) }, { from: next });
    expect(result.from).toBe(next);
  });
});
