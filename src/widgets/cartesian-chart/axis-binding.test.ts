import { bindSeriesToValueAxes } from './axis-binding';
import { describe, expect, it } from 'vitest';

function series(id: string, ...keys: string[]) {
  return { id, axisKeys: () => keys };
}

interface TestAxis {
  name: string;
  keys?: string[];
}

const left: TestAxis = { name: 'left', keys: ['revenue', 'cost'] };
const right: TestAxis = { name: 'right', keys: ['margin'] };
const bare: TestAxis = { name: 'bare' };

describe('bindSeriesToValueAxes', () => {
  it('sends every series to the only axis there is', () => {
    const binding = bindSeriesToValueAxes([series('bar-0', 'revenue'), series('line-1', 'margin')], [bare]);
    expect(binding.get('bar-0')).toBe(bare);
    expect(binding.get('line-1')).toBe(bare);
  });

  it('splits series between two axes by their value field', () => {
    const binding = bindSeriesToValueAxes([series('bar-0', 'revenue'), series('bar-1', 'cost'), series('line-2', 'margin')], [left, right]);
    expect(binding.get('bar-0')).toBe(left);
    expect(binding.get('bar-1')).toBe(left);
    expect(binding.get('line-2')).toBe(right);
  });

  it('matches a multi-field series on any one of its fields', () => {
    const ohlc = series('candlestick-0', 'open', 'high', 'low', 'close');
    const binding = bindSeriesToValueAxes([ohlc], [{ name: 'price', keys: ['low'] }, right]);
    expect(binding.get('candlestick-0')?.name).toBe('price');
  });

  it('matches on the series id, telling apart two series over one field', () => {
    const first = series('line-0', 'value');
    const second = series('line-1', 'value');
    const binding = bindSeriesToValueAxes(
      [first, second],
      [
        { name: 'a', keys: ['line-0'] },
        { name: 'b', keys: ['line-1'] },
      ],
    );
    expect(binding.get('line-0')?.name).toBe('a');
    expect(binding.get('line-1')?.name).toBe('b');
  });

  it('drops an unclaimed series on the first axis without keys', () => {
    const binding = bindSeriesToValueAxes([series('line-0', 'visitors')], [right, bare]);
    expect(binding.get('line-0')).toBe(bare);
  });

  it('falls back to the first axis when every axis has keys', () => {
    const binding = bindSeriesToValueAxes([series('line-0', 'visitors')], [left, right]);
    expect(binding.get('line-0')).toBe(left);
  });

  it('binds a series that reports no fields at all (histogram counts)', () => {
    const binding = bindSeriesToValueAxes([{ id: 'histogram-0' }], [left, bare]);
    expect(binding.get('histogram-0')).toBe(bare);
  });

  it('returns an empty binding when the chart has no value axes', () => {
    expect(bindSeriesToValueAxes([series('line-0', 'visitors')], []).size).toBe(0);
  });
});
