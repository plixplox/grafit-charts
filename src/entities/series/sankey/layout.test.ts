import { columnHeight, fitNodeSpacing, fitValueScale, MIN_NODE_HEIGHT } from './layout';
import { describe, expect, it } from 'vitest';

const PLOT_HEIGHT = 600;

/** Two columns: four sources feeding thirteen targets — the case that overflowed. */
const YEARS_TO_MONTHS: number[][] = [
  [120, 300, 180, 400],
  [70, 65, 80, 55, 90, 60, 75, 85, 50, 95, 40, 45, 90],
];

describe('sankey column height', () => {
  it('counts the gaps between nodes, not around them', () => {
    expect(columnHeight([10, 10, 10], 2, 5)).toBe(60 + 10);
    expect(columnHeight([10], 2, 5)).toBe(20);
    expect(columnHeight([], 2, 5)).toBe(0);
  });

  it('counts a node that rounds to nothing at its minimum height', () => {
    expect(columnHeight([0, 10], 1, 0)).toBe(MIN_NODE_HEIGHT + 10);
  });
});

describe('sankey value scale', () => {
  it('keeps the busiest column inside the plot', () => {
    const spacing = fitNodeSpacing(YEARS_TO_MONTHS, PLOT_HEIGHT, 14);
    const scale = fitValueScale(YEARS_TO_MONTHS, PLOT_HEIGHT, spacing);
    for (const column of YEARS_TO_MONTHS) {
      expect(columnHeight(column, scale, spacing)).toBeLessThanOrEqual(PLOT_HEIGHT);
    }
  });

  it('is set by the column with the most gaps, not the heaviest one', () => {
    const spacing = 14;
    const scale = fitValueScale(YEARS_TO_MONTHS, PLOT_HEIGHT, spacing);
    // the thirteen-node column runs out of room first: it fills the plot, the other one does not
    const [years, months] = YEARS_TO_MONTHS as [number[], number[]];
    expect(columnHeight(months, scale, spacing)).toBeCloseTo(PLOT_HEIGHT, 1);
    expect(columnHeight(years, scale, spacing)).toBeLessThan(PLOT_HEIGHT);
  });

  it('uses the whole height when there is nothing to reserve', () => {
    // one node, no gaps: the value gets the lot
    expect(fitValueScale([[50]], PLOT_HEIGHT, 14)).toBeCloseTo(PLOT_HEIGHT / 50, 6);
  });

  it('leaves the values less room as the gaps grow', () => {
    const tight = fitValueScale(YEARS_TO_MONTHS, PLOT_HEIGHT, 4);
    const roomy = fitValueScale(YEARS_TO_MONTHS, PLOT_HEIGHT, 30);
    expect(roomy).toBeLessThan(tight);
  });

  it('reports zero for data that carries no value', () => {
    expect(fitValueScale([[0, 0]], PLOT_HEIGHT, 14)).toBe(0);
    expect(fitValueScale([], PLOT_HEIGHT, 14)).toBe(0);
  });
});

describe('sankey node spacing', () => {
  it('holds the requested gap while it fits', () => {
    expect(fitNodeSpacing(YEARS_TO_MONTHS, PLOT_HEIGHT, 14)).toBe(14);
  });

  it('gives way when the gaps alone would outgrow the plot', () => {
    const many: number[][] = [Array.from({ length: 60 }, () => 10)];
    const spacing = fitNodeSpacing(many, PLOT_HEIGHT, 14);
    expect(spacing).toBeLessThan(14);
    // every node keeps its minimum height and the column still fits
    expect(columnHeight(many[0] as number[], 0, spacing)).toBeLessThanOrEqual(PLOT_HEIGHT);
  });

  it('collapses to nothing rather than going negative', () => {
    const crowded: number[][] = [Array.from({ length: 400 }, () => 10)];
    expect(fitNodeSpacing(crowded, PLOT_HEIGHT, 14)).toBe(0);
  });

  it('keeps the requested gap for a single node, where there is no gap to take', () => {
    expect(fitNodeSpacing([[10]], 10, 14)).toBe(14);
  });
});
