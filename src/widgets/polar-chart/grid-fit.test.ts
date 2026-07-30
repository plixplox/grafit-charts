import { fitPolarGrid, keepClearOf, placeRimLabel, thinLabels } from './grid-fit';
import type { LayoutRect } from '@/shared/kernel';
import { textBounds, type Bounds } from '@/shared/util';
import { describe, expect, it } from 'vitest';

const FONT_SIZE = 11;
const GAP = 10;
/** The fit stops chasing overhang below a hundredth of a pixel. */
const TOLERANCE = 0.05;

/** Six spokes starting at 12 o'clock, as a radar lays them out. */
function spokes(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index / count) * Math.PI * 2);
}

/** Rim labels of the given width on every spoke. */
function rimLabels(angles: number[], width: number) {
  return (centerX: number, centerY: number, radius: number): Bounds[] =>
    angles.map((angle) => {
      const placed = placeRimLabel(centerX, centerY, radius + GAP, angle);
      return textBounds(placed.x, placed.y, width, FONT_SIZE, placed.align, placed.baseline);
    });
}

describe('rim label placement', () => {
  it('reads outwards: the side of the circle decides where the text starts', () => {
    const right = placeRimLabel(100, 100, 50, Math.PI / 2);
    expect(right).toMatchObject({ x: 150, align: 'left', baseline: 'middle' });

    const left = placeRimLabel(100, 100, 50, -Math.PI / 2);
    expect(left).toMatchObject({ x: 50, align: 'right', baseline: 'middle' });

    // straight up and straight down: centred, and hung off the ring
    expect(placeRimLabel(100, 100, 50, 0)).toMatchObject({ y: 50, align: 'center', baseline: 'bottom' });
    expect(placeRimLabel(100, 100, 50, Math.PI)).toMatchObject({ y: 150, align: 'center', baseline: 'top' });
  });
});

describe('polar grid fit', () => {
  const area: LayoutRect = { x: 0, y: 0, width: 400, height: 400 };

  it('keeps the requested radius when the labels already fit', () => {
    const fit = fitPolarGrid(area, 120, rimLabels(spokes(6), 30));
    expect(fit).toEqual({ centerX: 200, centerY: 200, radius: 120 });
  });

  it('shrinks the grid until the widest label clears the area', () => {
    const width = 90;
    const fit = fitPolarGrid(area, 190, rimLabels(spokes(6), width));
    expect(fit.radius).toBeLessThan(190);
    for (const bounds of rimLabels(spokes(6), width)(fit.centerX, fit.centerY, fit.radius)) {
      expect(bounds.left).toBeGreaterThanOrEqual(area.x - TOLERANCE);
      expect(bounds.right).toBeLessThanOrEqual(area.x + area.width + TOLERANCE);
    }
  });

  it('gives up radius rather than labels in a tall, narrow area', () => {
    // the case that used to cut labels off: height sets the radius, width cannot hold it
    const tall: LayoutRect = { x: 0, y: 0, width: 400, height: 900 };
    const fit = fitPolarGrid(tall, 450, rimLabels(spokes(12), 60));
    expect(fit.radius).toBeLessThan(140);
    for (const bounds of rimLabels(spokes(12), 60)(fit.centerX, fit.centerY, fit.radius)) {
      expect(bounds.left).toBeGreaterThanOrEqual(tall.x - TOLERANCE);
      expect(bounds.right).toBeLessThanOrEqual(tall.x + tall.width + TOLERANCE);
    }
  });

  it('moves the centre when only one side is crowded', () => {
    // a single label to the left: the grid slides right instead of shrinking twice as much
    const oneSided = (centerX: number, centerY: number, radius: number): Bounds[] => {
      const placed = placeRimLabel(centerX, centerY, radius + GAP, -Math.PI / 2);
      return [textBounds(placed.x, placed.y, 120, FONT_SIZE, placed.align, placed.baseline)];
    };
    const fit = fitPolarGrid(area, 150, oneSided);
    expect(fit.centerX).toBeGreaterThan(200);
    expect(oneSided(fit.centerX, fit.centerY, fit.radius)[0]?.left).toBeGreaterThanOrEqual(area.x - TOLERANCE);
  });

  it('never shrinks past the floor, however long the labels are', () => {
    const fit = fitPolarGrid(area, 150, rimLabels(spokes(6), 5000), 20);
    expect(fit.radius).toBe(20);
  });
});

/** A column of boxes 20px wide, `step` px apart vertically. */
function column(count: number, step: number): Bounds[] {
  return Array.from({ length: count }, (_, index) => ({
    left: 0,
    right: 20,
    top: index * step,
    bottom: index * step + 10,
  }));
}

describe('thinning out labels that collide', () => {
  it('keeps every label while they stay clear of each other', () => {
    expect(thinLabels(column(5, 40))).toEqual([0, 1, 2, 3, 4]);
  });

  it('drops the ones that would touch the last label kept', () => {
    // rows 12px apart: a 10px glyph row plus the 4px clearance does not fit
    expect(thinLabels(column(6, 12))).toEqual([0, 2, 4]);
  });

  it('keeps whatever fits where there is room, not a fixed step', () => {
    const uneven = [
      { left: 0, right: 20, top: 0, bottom: 10 },
      { left: 0, right: 20, top: 11, bottom: 21 }, // collides with the first
      { left: 0, right: 20, top: 60, bottom: 70 }, // clear again
      { left: 0, right: 20, top: 80, bottom: 90 },
    ];
    expect(thinLabels(uneven)).toEqual([0, 2, 3]);
  });

  it('honours a wider clearance', () => {
    expect(thinLabels(column(4, 20), { clearance: 0 })).toEqual([0, 1, 2, 3]);
    expect(thinLabels(column(4, 20), { clearance: 12 })).toEqual([0, 2]);
  });

  it('closes the ring: the last survivor gives way to the first', () => {
    const ring = [
      { left: 0, right: 20, top: 0, bottom: 10 },
      { left: 40, right: 60, top: 0, bottom: 10 },
      { left: 15, right: 35, top: 0, bottom: 10 }, // back next to the first one
    ];
    expect(thinLabels(ring)).toEqual([0, 1, 2]);
    expect(thinLabels(ring, { closed: true })).toEqual([0, 1]);
  });

  it('leaves the survivors of a crowded rim collision-free', () => {
    const angles = Array.from({ length: 24 }, (_, index) => (index / 24) * Math.PI * 2);
    const bounds = rimLabels(angles, 50)(200, 200, 120);
    const kept = thinLabels(bounds, { closed: true });
    expect(kept.length).toBeGreaterThan(1);
    expect(kept.length).toBeLessThan(angles.length);
    for (const [position, index] of kept.entries()) {
      const next = kept[(position + 1) % kept.length];
      const a = bounds[index];
      const b = next === undefined ? undefined : bounds[next];
      if (!a || !b || a === b) continue;
      const apart = a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top;
      expect(apart).toBe(true);
    }
  });
});

describe('labels that give way to more important ones', () => {
  const rim = [
    { left: 100, right: 140, top: 0, bottom: 11 },
    { left: 100, right: 140, top: 100, bottom: 111 },
  ];

  it('keeps the ones that clear every box already taken', () => {
    const rings = [
      { left: 0, right: 30, top: 50, bottom: 60 }, // clear of both
      { left: 120, right: 150, top: 4, bottom: 14 }, // runs into the first rim label
      { left: 120, right: 150, top: 104, bottom: 114 }, // runs into the second
    ];
    expect(keepClearOf(rings, rim)).toEqual([0]);
  });

  it('checks against all of them, not just the last one kept', () => {
    // the collision is with the first rim label, several boxes back
    expect(keepClearOf([{ left: 100, right: 140, top: 2, bottom: 13 }], rim)).toEqual([]);
  });

  it('keeps the survivors clear of each other too', () => {
    const stacked = [
      { left: 0, right: 30, top: 50, bottom: 60 },
      { left: 0, right: 30, top: 61, bottom: 71 },
    ];
    expect(keepClearOf(stacked, rim)).toEqual([0]);
  });

  it('keeps everything when nothing is in the way', () => {
    expect(keepClearOf([{ left: 0, right: 30, top: 50, bottom: 60 }], [])).toEqual([0]);
  });
});
