import { formatDatePattern, formatNumberPattern, formatValue } from './format';
import { describe, expect, it } from 'vitest';

describe('formatNumberPattern', () => {
  // group() separates digit groups with a thin space U+2009
  const SP = ' ';

  it('fixed precision with thin-space digit grouping', () => {
    expect(formatNumberPattern(',.2f', 1234.567)).toBe(`1${SP}234.57`);
    expect(formatNumberPattern(',.0f', 1234567)).toBe(`1${SP}234${SP}567`);
  });

  it('percentages', () => {
    expect(formatNumberPattern('.0%', 0.42)).toBe('42%');
    expect(formatNumberPattern('.1%', 0.4567)).toBe('45.7%');
  });

  it('prefix and suffix are preserved', () => {
    expect(formatNumberPattern('$,.0f', 1234.5)).toBe(`$1${SP}235`);
    expect(formatNumberPattern('.1f kg', 2.5)).toBe('2.5 kg');
  });

  it('SI prefixes k/M/G with trailing-zero trimming', () => {
    expect(formatNumberPattern('s', 1_234_567)).toBe('1.2M');
    expect(formatNumberPattern('s', 1500)).toBe('1.5k');
    expect(formatNumberPattern('s', 1000)).toBe('1k');
    expect(formatNumberPattern('s', 2.5e9)).toBe('2.5G');
    expect(formatNumberPattern('s', 950)).toBe('950');
    expect(formatNumberPattern('.2s', 1_234_567)).toBe('1.23M');
  });

  it('integer format rounds', () => {
    expect(formatNumberPattern('d', 1234.6)).toBe('1235');
  });

  it('unrecognized pattern and non-finite values yield String(value)', () => {
    expect(formatNumberPattern('xyz', 12)).toBe('12');
    expect(formatNumberPattern('.2f', NaN)).toBe('NaN');
    expect(formatNumberPattern('.2f', Infinity)).toBe('Infinity');
  });
});

describe('formatDatePattern', () => {
  // Local components: the date is created via the local constructor,
  // getters are local too — the result does not depend on the TZ.
  const date = new Date(2024, 0, 5, 9, 7, 3);

  it('every token of the strftime subset', () => {
    expect(formatDatePattern('%d', date)).toBe('05');
    expect(formatDatePattern('%m', date)).toBe('01');
    expect(formatDatePattern('%b', date)).toBe('Jan');
    expect(formatDatePattern('%B', date)).toBe('January');
    expect(formatDatePattern('%Y', date)).toBe('2024');
    expect(formatDatePattern('%y', date)).toBe('24');
    expect(formatDatePattern('%H', date)).toBe('09');
    expect(formatDatePattern('%M', date)).toBe('07');
    expect(formatDatePattern('%S', date)).toBe('03');
    expect(formatDatePattern('%%', date)).toBe('%');
  });

  it('combined pattern', () => {
    expect(formatDatePattern('%d.%m.%Y', date)).toBe('05.01.2024');
    expect(formatDatePattern('%d %B %Y, %H:%M', date)).toBe('05 January 2024, 09:07');
  });
});

describe('formatValue', () => {
  it('date pattern with a Date and with a numeric timestamp', () => {
    const date = new Date(2024, 5, 15);
    expect(formatValue('%d.%m.%Y', date)).toBe('15.06.2024');
    expect(formatValue('%Y', date.getTime())).toBe('2024');
  });

  it('date pattern with the ISO string a JSON row carries', () => {
    expect(formatValue('%Y', '2024-06-15T00:00:00Z')).toBe('2024');
  });

  it('date pattern with an unparseable value falls back to String', () => {
    expect(formatValue('%Y', 'abc')).toBe('abc');
  });

  it('numeric pattern with % and no date tokens stays numeric', () => {
    expect(formatValue('.0%', 0.5)).toBe('50%');
  });

  it('strings pass through', () => {
    expect(formatValue('xyz', 'hello')).toBe('hello');
  });
});
