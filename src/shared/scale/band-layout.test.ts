import { bandLayout, closestSpan } from './band-layout';
import { BandScale } from './band-scale';
import { LinearScale } from './linear-scale';
import { LogScale } from './log-scale';
import { TimeScale } from './time-scale';
import { describe, expect, it } from 'vitest';

const DAY = 24 * 3600 * 1000;
const day = (index: number) => Date.UTC(2025, 0, 1) + index * DAY;

describe('closestSpan', () => {
  it('takes the smallest distance, not the average', () => {
    // a month missing between the second and the third point
    expect(closestSpan([day(0), day(1), day(10)])).toBe(DAY);
  });

  it('reads dates and ISO strings, in any order', () => {
    expect(closestSpan([new Date(day(2)), '2025-01-01T00:00:00Z'])).toBe(2 * DAY);
  });

  it('repeated values are no distance at all', () => {
    expect(closestSpan([day(0), day(0), day(3)])).toBe(3 * DAY);
    expect(closestSpan([day(0), day(0)])).toBeUndefined();
  });

  it('a single point says nothing about the step', () => {
    expect(closestSpan([day(0)])).toBeUndefined();
    expect(closestSpan([])).toBeUndefined();
  });

  it('numbers go through the parser of the axis they belong to', () => {
    expect(closestSpan(['1', '4', '9'], Number)).toBe(3);
  });
});

describe('bandLayout over a band scale', () => {
  const scale = new BandScale<string>(['a', 'b', 'c'], [0, 100]);
  const bands = bandLayout(scale, undefined, 100);

  it('bands are the scale’s own', () => {
    const band = bands.bandOf('b')!;
    expect(band.start).toBeCloseTo(scale.convert('b'));
    expect(band.size).toBeCloseTo(scale.bandwidth);
    expect(band.step).toBeCloseTo(scale.stepSize);
  });

  it('a value outside the domain has no band', () => {
    expect(bands.bandOf('x')).toBeUndefined();
  });
});

describe('bandLayout over a time scale', () => {
  // three days across 300px: a day is 150px, since the domain spans two of them
  const scale = new TimeScale([day(0), day(2)], [0, 300]);

  it('a band is one span wide, centred on its value', () => {
    const bands = bandLayout(scale, DAY, 300);
    const band = bands.bandOf(new Date(day(1)))!;
    expect(band.size).toBeCloseTo(150);
    expect(band.start).toBeCloseTo(75);
    expect(band.step).toBeCloseTo(band.size);
  });

  it('the span is in axis units, so a zoom keeps a bar over its period', () => {
    const zoomed = new TimeScale([day(0), day(1)], [0, 300]);
    expect(bandLayout(zoomed, DAY, 300).bandOf(day(0))!.size).toBeCloseTo(300);
  });

  it('an ISO string is placed where its date is', () => {
    expect(bandLayout(scale, DAY, 300).bandOf('2025-01-03T00:00:00Z')!.start).toBeCloseTo(225);
  });

  it('a value that is no date has no band', () => {
    expect(bandLayout(scale, DAY, 300).bandOf('Северо-Запад')).toBeUndefined();
  });

  it('without a span the band falls back to a share of the plot', () => {
    const bands = bandLayout(scale, undefined, 300);
    const band = bands.bandOf(day(1))!;
    expect(band.size).toBeCloseTo(30);
    expect(band.start).toBeCloseTo(150 - 15);
  });
});

describe('bandLayout over other continuous scales', () => {
  it('a number scale takes its values as numbers', () => {
    const bands = bandLayout(new LinearScale([0, 10], [0, 100]), 2, 100);
    const band = bands.bandOf(5)!;
    expect(band.size).toBeCloseTo(20);
    expect(band.start).toBeCloseTo(40);
  });

  it('an inverted range (a vertical axis) still starts at the smaller pixel', () => {
    const bands = bandLayout(new LinearScale([0, 10], [100, 0]), 2, 100);
    const band = bands.bandOf(5)!;
    expect(band.size).toBeCloseTo(20);
    expect(band.start).toBeCloseTo(40);
  });

  it('on a log scale both edges are converted, so a band is lopsided', () => {
    const bands = bandLayout(new LogScale([1, 100], [0, 100]), 1, 100);
    const band = bands.bandOf(10)!;
    // the band runs from 9.5 to 10.5 — narrower above the value than below it
    expect(band.start).toBeCloseTo(Math.log10(9.5) * 50);
    expect(band.size).toBeCloseTo((Math.log10(10.5) - Math.log10(9.5)) * 50);
  });
});
