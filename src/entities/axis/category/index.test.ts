import { CategoryAxis, type CategoryAxisOptions } from './index';
import type { AxisEnv, AxisPosition, ThemeContext, LayoutRect } from '@/shared/kernel';
import { Group, Line, Text } from '@/shared/scene';
import { describe, expect, it } from 'vitest';

const theme: ThemeContext = {
  backgroundColor: '#fff',
  foregroundColor: '#000',
  mutedColor: '#888',
  axisColor: '#ddd',
  fontFamily: 'sans-serif',
  fontSize: 11,
  strokeWidth: 2,
  positiveColor: '#21a06c',
  negativeColor: '#e5484d',
  palette: { fills: [], strokes: [], sequential: ['#dbe6ff', '#1d4fd7'] },
  axis: { line: true, tick: false, gridLine: true, strokeWidth: 1, gridDash: [4, 4] },
};

const plot: LayoutRect = { x: 40, y: 20, width: 400, height: 300 };
const domain = ['Alfa', 'Bravo', 'Charlie', 'Delta'];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

function axis(
  options: Partial<CategoryAxisOptions>,
  position: AxisPosition = 'left',
  values: unknown[] = domain,
  chrome?: Partial<ThemeContext['axis']>,
): CategoryAxis {
  const env: AxisEnv = { position, theme: chrome ? { ...theme, axis: { ...theme.axis, ...chrome } } : theme };
  const instance = new CategoryAxis({ type: 'category', ...options }, env);
  instance.setDomain(values);
  instance.layout(plot);
  return instance;
}

/** Gap between two neighbouring bands, px. */
function bandGap(instance: CategoryAxis): number {
  return instance.scale.convert('Bravo') - (instance.scale.convert('Alfa') + instance.scale.bandwidth);
}

/** Nodes appended to a scene layer (Group keeps its children private). */
function capture(): { layer: Group; nodes: Text[] } {
  const layer = new Group();
  const nodes: Text[] = [];
  layer.append = ((...appended) => {
    for (const node of appended) if (node instanceof Text) nodes.push(node);
    return layer;
  }) as typeof layer.append;
  return { layer, nodes };
}

/** Line nodes appended to a scene layer. */
function captureLines(): { layer: Group; lines: Line[] } {
  const layer = new Group();
  const lines: Line[] = [];
  layer.append = ((...appended) => {
    for (const node of appended) if (node instanceof Line) lines.push(node);
    return layer;
  }) as typeof layer.append;
  return { layer, lines };
}

describe('default axis look', () => {
  it('draws the axis line without ticks, in the axis color', () => {
    const axisLayer = captureLines();
    axis({}, 'bottom').render(axisLayer.layer, new Group(), plot);

    expect(axisLayer.lines).toHaveLength(1);
    expect(axisLayer.lines[0]?.stroke).toBe(theme.axisColor);
    // the dash belongs to the grid, not to the axis line
    expect(axisLayer.lines[0]?.lineDash).toBeUndefined();
  });

  it('adds one tick per category when ticks are asked for', () => {
    const axisLayer = captureLines();
    axis({ tick: { enabled: true } }, 'bottom').render(axisLayer.layer, new Group(), plot);

    // the axis line plus the ticks
    expect(axisLayer.lines).toHaveLength(1 + domain.length);
    for (const line of axisLayer.lines) expect(line.stroke).toBe(theme.axisColor);
  });

  it('draws a dashed grid in the axis color', () => {
    const gridLayer = captureLines();
    axis({}, 'bottom').render(new Group(), gridLayer.layer, plot);

    expect(gridLayer.lines).toHaveLength(domain.length);
    for (const grid of gridLayer.lines) {
      expect(grid.stroke).toBe(theme.axisColor);
      expect(grid.lineDash).toEqual([4, 4]);
    }
  });
});

describe('axis chrome from the theme', () => {
  it('turns ticks on without any per-axis option', () => {
    const axisLayer = captureLines();
    axis({}, 'bottom', domain, { tick: true }).render(axisLayer.layer, new Group(), plot);

    expect(axisLayer.lines).toHaveLength(1 + domain.length);
  });

  it('lets a per-axis option win over the theme switch', () => {
    const axisLayer = captureLines();
    axis({ tick: { enabled: false } }, 'bottom', domain, { tick: true }).render(axisLayer.layer, new Group(), plot);

    expect(axisLayer.lines).toHaveLength(1);
  });

  it('silences the axis line and the grid', () => {
    const axisLayer = captureLines();
    const gridLayer = captureLines();
    axis({}, 'bottom', domain, { line: false, gridLine: false }).render(axisLayer.layer, gridLayer.layer, plot);

    expect(axisLayer.lines).toHaveLength(0);
    expect(gridLayer.lines).toHaveLength(0);
  });

  it('carries the thickness and the dash pattern through', () => {
    const axisLayer = captureLines();
    const gridLayer = captureLines();
    axis({}, 'bottom', domain, { strokeWidth: 2.5, gridDash: [] }).render(axisLayer.layer, gridLayer.layer, plot);

    expect(axisLayer.lines[0]?.strokeWidth).toBe(2.5);
    expect(gridLayer.lines[0]?.strokeWidth).toBe(2.5);
    expect(gridLayer.lines[0]?.lineDash).toEqual([]);
  });

  it('splits the line, the grid and the ticks apart when the theme asks', () => {
    const axisLayer = captureLines();
    const gridLayer = captureLines();
    axis({}, 'bottom', domain, { tick: true, color: '#111111', gridColor: '#222222', tickColor: '#333333' }).render(
      axisLayer.layer,
      gridLayer.layer,
      plot,
    );

    expect(axisLayer.lines[0]?.stroke).toBe('#111111');
    expect(gridLayer.lines[0]?.stroke).toBe('#222222');
    for (const tick of axisLayer.lines.slice(1)) expect(tick.stroke).toBe('#333333');
  });
});

describe('per-axis line and tick styling', () => {
  it('styles the axis line like the grid — colour, width and dash', () => {
    const axisLayer = captureLines();
    axis({ line: { stroke: '#0f766e', width: 3, lineDash: [6, 2] } }, 'bottom').render(axisLayer.layer, new Group(), plot);

    expect(axisLayer.lines[0]?.stroke).toBe('#0f766e');
    expect(axisLayer.lines[0]?.strokeWidth).toBe(3);
    expect(axisLayer.lines[0]?.lineDash).toEqual([6, 2]);
  });

  it('lets the axis dash win over the theme, and an empty array undo it', () => {
    const dashed = captureLines();
    axis({ line: { lineDash: [2, 2] } }, 'bottom', domain, { lineDash: [8, 8] }).render(dashed.layer, new Group(), plot);
    expect(dashed.lines[0]?.lineDash).toEqual([2, 2]);

    const solid = captureLines();
    axis({ line: { lineDash: [] } }, 'bottom', domain, { lineDash: [8, 8] }).render(solid.layer, new Group(), plot);
    expect(solid.lines[0]?.lineDash).toBeUndefined();
  });

  it('sizes and colours the ticks from the axis options', () => {
    const axisLayer = captureLines();
    axis({ tick: { enabled: true, size: 10, width: 2, stroke: '#e5484d' } }, 'bottom').render(axisLayer.layer, new Group(), plot);

    const ticks = axisLayer.lines.slice(1);
    expect(ticks).toHaveLength(domain.length);
    for (const tick of ticks) {
      // a bottom axis draws its ticks outwards, below the line
      expect(tick.y2 - tick.y1).toBe(10);
      expect(tick.strokeWidth).toBe(2);
      expect(tick.stroke).toBe('#e5484d');
    }
  });

  it('takes tick.color as an alias of tick.stroke, and beats the theme tick colour', () => {
    const axisLayer = captureLines();
    axis({ tick: { enabled: true, color: '#333333' } }, 'bottom', domain, { tickColor: '#999999' }).render(
      axisLayer.layer,
      new Group(),
      plot,
    );

    for (const tick of axisLayer.lines.slice(1)) expect(tick.stroke).toBe('#333333');
  });
});

describe('category axis with inside labels', () => {
  it('reserves no thickness for the plot rect', () => {
    expect(axis({ label: { placement: 'inside' } }).measure(measureText)).toBe(0);
    // ...unlike the default outside placement, where the labels push the plot in
    expect(axis({}).measure(measureText)).toBeGreaterThan(0);
  });

  it('reserves the tick length when ticks are asked for explicitly', () => {
    expect(axis({ label: { placement: 'inside' }, tick: { enabled: true, size: 5 } }).measure(measureText)).toBe(5);
  });

  it('reserves a label row above the first band and adds it to the default gap', () => {
    const inside = axis({ label: { placement: 'inside', fontSize: 12, insideGap: 5 } });
    const slot = 12 + 5 * 2;
    expect(inside.scale.range).toEqual([plot.y + slot, plot.y + plot.height]);
    // step = (span + slot) / (count − paddingInner + 2 · paddingOuter) = 300 / 4
    expect(inside.scale.stepSize).toBeCloseTo(75, 6);
    // the label row on top of the default 0.2 gap
    expect(bandGap(inside)).toBeCloseTo(slot + 0.2 * 75, 6);
  });

  it('keeps an explicit paddingInner as a gap of its own on top of the label row', () => {
    const inside = axis({ paddingInner: 0.5, label: { placement: 'inside' } });
    const slot = 11 + 4 * 2;
    expect(bandGap(inside)).toBeCloseTo(slot + 0.5 * inside.scale.stepSize, 6);
  });

  it('does not touch the band layout with outside labels', () => {
    const outside = axis({});
    expect(outside.scale.range).toEqual([plot.y, plot.y + plot.height]);
    expect(outside.scale.paddingInner).toBe(0.2);
    expect(bandGap(outside)).toBeCloseTo(0.2 * outside.scale.stepSize, 6);
  });

  it('keeps the two inside distances apart: the indent from the axis, the gap to the band', () => {
    const inside = axis({ label: { placement: 'inside', insideSpacing: 10, insideGap: 3 } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    expect(nodes.map((node) => node.text)).toEqual(domain);
    for (const [index, node] of nodes.entries()) {
      expect(node.x).toBe(plot.x + 10);
      expect(node.textAlign).toBe('left');
      expect(node.textBaseline).toBe('bottom');
      expect(node.y).toBeCloseTo(inside.scale.convert(domain[index]) - 3, 6);
    }
  });

  it('ignores label.spacing — that one is for outside labels', () => {
    const inside = axis({ label: { placement: 'inside', spacing: 30 } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    for (const node of nodes) expect(node.x).toBe(plot.x + 4);
  });

  it('centres the labels in the gap with insideAlign: gap', () => {
    const inside = axis({ label: { placement: 'inside', insideAlign: 'gap' } });
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    const gap = inside.scale.stepSize - inside.scale.bandwidth;
    for (const [index, node] of nodes.entries()) {
      expect(node.textBaseline).toBe('middle');
      expect(node.y).toBeCloseTo(inside.scale.convert(domain[index]) - gap / 2, 6);
    }
  });

  it('thins the labels out when a row per band no longer fits', () => {
    const many = Array.from({ length: 40 }, (_, index) => `Item ${index}`);
    const inside = axis({ label: { placement: 'inside' } }, 'left', many);
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    // the row needs 19 px, the step is about 7 — every third label survives
    const stride = Math.ceil(19 / inside.scale.stepSize);
    expect(stride).toBeGreaterThan(1);
    expect(nodes.map((node) => node.text)).toEqual(many.filter((_, index) => index % stride === 0));
  });

  it('keeps every label when avoidCollisions is off', () => {
    const many = Array.from({ length: 40 }, (_, index) => `Item ${index}`);
    const inside = axis({ label: { placement: 'inside', avoidCollisions: false } }, 'left', many);
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    expect(nodes).toHaveLength(many.length);
  });

  it('draws the labels along the inner edge on a horizontal axis', () => {
    const inside = axis({ label: { placement: 'inside', insideSpacing: 4 } }, 'bottom');
    const { layer: foreground, nodes } = capture();
    inside.render(new Group(), new Group(), plot, foreground);

    for (const [index, node] of nodes.entries()) {
      expect(node.x).toBeCloseTo(inside.scale.center(domain[index]), 6);
      expect(node.textAlign).toBe('center');
      expect(node.y).toBe(plot.y + plot.height - 4);
      expect(node.textBaseline).toBe('bottom');
    }
  });
});

describe('labels hanging over the ends of the axis', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it('stays at zero while every band centre is far enough from the ends', () => {
    // a band label is centred on its band, and half a band is wider than half a name here
    expect(axis({}, 'bottom').labelOverflow(measureText, plot)).toEqual(none);
  });

  it('asks for the part of a long name that sticks out past the plot', () => {
    const wide = axis({}, 'bottom', ['Alfa', 'Bravo Charlie Delta Echo']);
    const overflow = wide.labelOverflow(measureText, plot);
    const last = wide.scale.center('Bravo Charlie Delta Echo');
    expect(overflow.right).toBeCloseTo(measureText('Bravo Charlie Delta Echo') / 2 - (plot.x + plot.width - last), 6);
    // across the axis its own zone already covers the labels
    expect(overflow.top).toBe(0);
    expect(overflow.bottom).toBe(0);
  });

  it('asks for nothing when the labels are off or drawn inside the plot', () => {
    expect(axis({ label: { enabled: false } }, 'bottom', ['Bravo Charlie Delta Echo']).labelOverflow(measureText, plot)).toEqual(none);
    expect(axis({ label: { placement: 'inside' } }, 'bottom', ['Bravo Charlie Delta Echo']).labelOverflow(measureText, plot)).toEqual(none);
  });
});

describe('labels cut to the room they have', () => {
  /**
   * Four names on a 400 px axis: the step is 100 px, so a label has 92 px once
   * the 8 px of minimum spacing are gone. Rendering measures without a canvas —
   * 0.6 · 11 px = 6.6 px per character — which is what these expectations count in.
   */
  const long = ['Strawberry jam', 'Blueberry pie', 'Raspberry tart', 'Blackcurrant'];

  /** Label texts as they are drawn. */
  function drawn(instance: CategoryAxis): Array<string | undefined> {
    const { layer, nodes } = capture();
    instance.render(layer, new Group(), plot);
    return nodes.map((node) => node.text);
  }

  it('drops the crowded labels by default', () => {
    // 92.4 px of name plus 8 px of spacing overruns the 100 px step: every other one goes
    expect(drawn(axis({}, 'bottom', long))).toEqual(['Strawberry jam', 'Raspberry tart']);
  });

  it('keeps every label and cuts the ones that do not fit', () => {
    expect(drawn(axis({ label: { overflow: 'ellipsis' } }, 'bottom', long))).toEqual([
      'Strawberry ..',
      // the two that fit their 92 px are drawn whole
      'Blueberry pie',
      'Raspberry t..',
      'Blackcurrant',
    ]);
  });

  it('leaves no label wider than its own step', () => {
    for (const text of drawn(axis({ label: { overflow: 'ellipsis' } }, 'bottom', long))) {
      expect(text!.length * 6.6).toBeLessThanOrEqual(92);
    }
  });

  it('takes the mark that stands for the cut from label.ellipsis', () => {
    const single = drawn(axis({ label: { overflow: 'ellipsis', ellipsis: '…' } }, 'bottom', long));
    expect(single[2]).toBe('Raspberry ta…');
  });

  it('holds a label to maxWidth whether or not the axis is crowded', () => {
    // one name on a 400 px axis crowds nobody, and is still cut to the 40 px asked for
    expect(drawn(axis({ label: { maxWidth: 40 } }, 'bottom', ['Strawberry jam']))).toEqual(['Stra..']);
  });

  it('shrinks the room a vertical axis takes to the width its labels are cut to', () => {
    // measureText counts 10 px per character here: four characters and the mark make 50
    expect(axis({ label: { maxWidth: 50 } }, 'left', long).measure(measureText)).toBe(8 + 50);
    expect(axis({}, 'left', long).measure(measureText)).toBe(8 + 140);
  });

  it('asks for no room past the ends of the axis for a cut label', () => {
    const wide = axis({ label: { overflow: 'ellipsis', maxWidth: 20 } }, 'bottom', ['Alfa', 'Bravo Charlie Delta Echo']);
    const overflow = wide.labelOverflow(measureText, plot);
    // the mark alone is what is left of the last name, and half of it clears the plot edge
    expect(overflow.right).toBe(0);
  });
});

describe('gap between categories in px', () => {
  it('holds the gap exactly, whatever the count', () => {
    for (const count of [3, 6]) {
      const values = Array.from({ length: count }, (_, index) => `Item ${index}`);
      const axed = axis({ gap: 24 }, 'left', values);
      const gap = axed.scale.stepSize - axed.scale.bandwidth;
      expect(gap).toBeCloseTo(24, 6);
    }
  });

  it('caps the gap so that a band never vanishes', () => {
    const values = Array.from({ length: 12 }, (_, index) => `Item ${index}`);
    const axed = axis({ gap: 24 }, 'left', values);
    // 24 px would eat 90% of a 26 px step — the cap keeps a band to show
    expect(axed.scale.paddingInner).toBe(0.8);
    expect(axed.scale.bandwidth).toBeCloseTo(0.2 * axed.scale.stepSize, 6);
  });

  it('takes precedence over paddingInner', () => {
    const axed = axis({ paddingInner: 0.5, gap: 10 });
    expect(bandGap(axed)).toBeCloseTo(10, 6);
  });

  it('adds the inside label row on top of it', () => {
    const inside = axis({ gap: 10, label: { placement: 'inside' } });
    const slot = 11 + 4 * 2;
    expect(bandGap(inside)).toBeCloseTo(slot + 10, 6);
  });
});

describe('labels at an angle', () => {
  /** Four names on a 400 px axis: a 100 px step, and 92 px of room for a level label. */
  const long = ['Strawberry jam', 'Blueberry pie', 'Raspberry tart', 'Blackcurrant'];
  const diagonal = Math.SQRT1_2;
  /** Half a glyph row turned by 45°: how far a tilted label leans back over its gap. */
  const lean = (11 / 2) * diagonal;

  /** Label nodes as they are drawn. */
  function drawn(instance: CategoryAxis): Text[] {
    const { layer, nodes } = capture();
    instance.render(layer, new Group(), plot);
    return nodes;
  }

  it('ends every name at its own tick, turned by the angle asked for', () => {
    const nodes = drawn(axis({ label: { rotation: -45 } }, 'bottom', long));

    expect(nodes).toHaveLength(long.length);
    for (const [index, node] of nodes.entries()) {
      expect(node.rotation).toBe(-45);
      // the text runs up to the right and stops at the tick, centred across its row
      expect(node.textAlign).toBe('right');
      expect(node.textBaseline).toBe('middle');
      expect(node.x).toBeCloseTo(axis({}, 'bottom', long).scale.center(long[index]), 6);
      // the gap from the axis reads as the 8 px asked for, lean and all
      expect(node.y).toBeCloseTo(plot.y + plot.height + 8 + lean, 6);
    }
  });

  it('runs the names the other way when the tilt does', () => {
    expect(drawn(axis({ label: { rotation: 45 } }, 'bottom', long))[0]?.textAlign).toBe('left');
    // above the plot the same tilt leans the other way to keep clear of it
    expect(drawn(axis({ label: { rotation: 45 } }, 'top', long))[0]?.textAlign).toBe('right');
    expect(drawn(axis({ label: { rotation: -45 } }, 'left', long))[0]?.textAlign).toBe('right');
  });

  it('keeps the names a level axis would have had to drop', () => {
    // 92 px of name in a 100 px step: level, every other one goes
    expect(drawn(axis({}, 'bottom', long)).map((node) => node.text)).toHaveLength(2);
    // tilted, the names lie in parallel strips and clear each other by a line of text
    expect(drawn(axis({ label: { rotation: -45 } }, 'bottom', long)).map((node) => node.text)).toEqual(long);
  });

  it('thins by the room a line of text needs across the tilt', () => {
    const many = Array.from({ length: 40 }, (_, index) => `Item ${index}`);
    const tilted = axis({ label: { rotation: -45 } }, 'left', many);
    // 11 px of glyph row measured across a 45° strip, plus the 8 px labels keep apart
    const stride = Math.ceil((11 / diagonal + 8) / tilted.scale.stepSize);
    expect(stride).toBeGreaterThan(1);
    expect(drawn(tilted).map((node) => node.text)).toEqual(many.filter((_, index) => index % stride === 0));
  });

  it('reserves the room the tilted text takes from the plot', () => {
    // the turned row of the longest name: 140 px of text and 11 px of height, at 45°
    const tilted = axis({ label: { rotation: -45 } }, 'bottom', long).measure(measureText);
    expect(tilted).toBe(Math.ceil(8 + (140 + 11) * diagonal));
    // standing on end it is the length of the name that the axis has to find room for
    expect(axis({ label: { rotation: -90 } }, 'bottom', long).measure(measureText)).toBe(8 + 140);
    // and a vertical axis gives most of that room back
    expect(axis({ label: { rotation: -90 } }, 'left', long).measure(measureText)).toBe(8 + 11);
  });

  it('asks for the room the leaning end of the axis needs', () => {
    const tilted = axis({ label: { rotation: -45 } }, 'bottom', long);
    const overflow = tilted.labelOverflow(measureText, plot);
    // the first name trails down and to the left of its tick, past the start of the plot
    const first = tilted.scale.center(long[0]);
    expect(overflow.left).toBeCloseTo(plot.x - (first - (measureText(long[0]!) + 11 / 2) * diagonal), 6);
    expect(overflow.right).toBe(0);
  });

  it('leaves labels drawn inside the plot level', () => {
    const inside = drawn(axis({ label: { placement: 'inside', rotation: -45 } }, 'bottom', long));
    for (const node of inside) expect(node.rotation).toBe(0);
  });
});

describe('a tilt the axis picks for itself', () => {
  const long = ['Strawberry jam', 'Blueberry pie', 'Raspberry tart', 'Blackcurrant'];

  /** Label texts as they are drawn. */
  function drawnText(instance: CategoryAxis): Array<string | undefined> {
    const { layer, nodes } = capture();
    instance.render(layer, new Group(), plot);
    return nodes.map((node) => node.text);
  }

  /** Rotation of the labels as they are drawn; every one of them agrees. */
  function tilt(instance: CategoryAxis): number {
    const { layer, nodes } = capture();
    instance.render(layer, new Group(), plot);
    const angles = new Set(nodes.map((node) => node.rotation));
    expect(angles.size).toBe(1);
    return [...angles][0]!;
  }

  it('leaves the labels level while they all fit that way', () => {
    // four short names in a 100 px step: nothing to answer for
    expect(tilt(axis({ label: { rotation: 'auto' } }, 'bottom'))).toBe(0);
  });

  it('tilts as soon as a name would otherwise have to go', () => {
    // 92 px of name in a 100 px step: level, the axis would drop every other one
    expect(tilt(axis({ label: { rotation: 'auto' } }, 'bottom', long))).toBe(-30);
    expect(drawnText(axis({ label: { rotation: 'auto' } }, 'bottom', long))).toEqual(long);
  });

  it('takes the gentlest angle the step leaves room for', () => {
    // a label needs a line of text across the strips: 30 px of step at 30°, 19 on end
    for (const [count, angle] of [
      [13, -30],
      [16, -45],
      [18, -60],
      [20, -90],
    ] as const) {
      const many = Array.from({ length: count }, (_, index) => `Category ${index}`);
      expect([count, tilt(axis({ label: { rotation: 'auto' } }, 'bottom', many))]).toEqual([count, angle]);
    }
  });

  it('reserves the room for the angle it picked', () => {
    const auto = axis({ label: { rotation: 'auto' } }, 'bottom', long);
    // 140 px of the longest name laid across 30°, plus the glyph row across the rest
    expect(auto.measure(measureText)).toBe(Math.ceil(8 + 140 * Math.sin(Math.PI / 6) + 11 * Math.cos(Math.PI / 6)));
  });

  it('holds the tilt it settled on while the plot moves under it', () => {
    // the room a tilt takes at the ends of the axis is what moves the plot: were
    // the axis to answer the wider plot with a gentler angle again, the two would
    // chase each other from one layout pass to the next and settle on neither
    const many = Array.from({ length: 13 }, (_, index) => `Category ${index}`);
    const auto = axis({ label: { rotation: 'auto' } }, 'bottom', many);
    expect(tilt(auto)).toBe(-30);
    auto.layout({ ...plot, width: 320 });
    expect(tilt(auto)).toBe(-45);
    auto.layout(plot);
    expect(tilt(auto)).toBe(-45);
  });

  it('decides afresh for the next lot of data', () => {
    const auto = axis({ label: { rotation: 'auto' } }, 'bottom', long);
    expect(tilt(auto)).toBe(-30);
    auto.setDomain([...domain]);
    auto.layout(plot);
    expect(tilt(auto)).toBe(0);
  });

  it('stays level where the axis has been given its own answer to crowding', () => {
    // cut labels, or labels left alone on purpose: neither is asking for a tilt
    expect(tilt(axis({ label: { rotation: 'auto', overflow: 'ellipsis' } }, 'bottom', long))).toBe(0);
    expect(tilt(axis({ label: { rotation: 'auto', avoidCollisions: false } }, 'bottom', long))).toBe(0);
    // and a vertical axis reads its labels across itself, a line each
    expect(tilt(axis({ label: { rotation: 'auto' } }, 'left', long))).toBe(0);
  });
});
