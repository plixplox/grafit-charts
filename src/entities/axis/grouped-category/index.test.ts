import { GroupedCategoryAxis, type GroupedCategoryAxisOptions } from './index';
import type { AxisEnv, AxisPosition, LayoutRect, ThemeContext } from '@/shared/kernel';
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
/** Two years by two quarters — one row of groups. */
const domain = [
  ['2018', 'Q1'],
  ['2018', 'Q2'],
  ['2019', 'Q1'],
  ['2019', 'Q2'],
];
/** 10px per character — keeps the expectations arithmetic. */
const measureText = (text: string) => text.length * 10;

/** Tick labels take 8 px of spacing plus the 11 px glyph row on a horizontal axis. */
const TICK_ZONE = 19;
/** A group row is the glyph row plus its leading, and rows are 8 px apart. */
const ROW_HEIGHT = 16;
const ROW_SPACING = 8;

function axis(
  options: Partial<GroupedCategoryAxisOptions>,
  values: unknown[] = domain,
  position: AxisPosition = 'bottom',
): GroupedCategoryAxis {
  const env: AxisEnv = { position, theme };
  const instance = new GroupedCategoryAxis({ type: 'grouped-category', ...options }, env);
  instance.setDomain(values);
  instance.layout(plot);
  return instance;
}

/** Text and Line nodes appended to a scene layer (Group keeps its children private). */
function capture(): { layer: Group; nodes: Text[]; lines: Line[] } {
  const layer = new Group();
  const nodes: Text[] = [];
  const lines: Line[] = [];
  layer.append = ((...appended) => {
    for (const node of appended) {
      if (node instanceof Text) nodes.push(node);
      if (node instanceof Line) lines.push(node);
    }
    return layer;
  }) as typeof layer.append;
  return { layer, nodes, lines };
}

/** Group names only: the tick labels are the ones sitting closest to the axis. */
function groupLabels(instance: GroupedCategoryAxis): Text[] {
  const axisLayer = capture();
  instance.render(axisLayer.layer, new Group(), plot);
  const edge = plot.y + plot.height;
  return axisLayer.nodes.filter((node) => node.y > edge + TICK_ZONE);
}

/** Tick labels only: the row of item names sitting closest to the axis. */
function tickLabels(instance: GroupedCategoryAxis): Text[] {
  const axisLayer = capture();
  instance.render(axisLayer.layer, new Group(), plot);
  const edge = plot.y + plot.height;
  return axisLayer.nodes.filter((node) => node.y <= edge + TICK_ZONE);
}

/** Separators between groups: the vertical lines below the axis line. */
function separators(instance: GroupedCategoryAxis): Line[] {
  const axisLayer = capture();
  instance.render(axisLayer.layer, new Group(), plot);
  return axisLayer.lines.filter((line) => line.x1 === line.x2);
}

describe('group names go through a formatter of their own', () => {
  it('formats the group with groupLabel.formatter, tick labels with label.formatter', () => {
    const instance = axis({
      label: { formatter: ({ value }) => `item ${(value as string[])[1]}` },
      groupLabel: { formatter: ({ value }) => `year ${String(value)}` },
    });

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['year 2018', 'year 2019']);
  });

  it('hands the formatter the raw level value, its row and the categories it covers', () => {
    const seen: Array<{ value: unknown; level: number; start: number; end: number }> = [];
    const instance = axis({
      groupLabel: {
        formatter: (params) => {
          seen.push(params);
          return String(params.value);
        },
      },
    });
    groupLabels(instance);

    expect(seen).toEqual([
      { value: '2018', level: 0, start: 0, end: 1 },
      { value: '2019', level: 0, start: 2, end: 3 },
    ]);
  });

  it('takes a serializable format string as well', () => {
    const instance = axis({ groupLabel: { format: '%b %Y' } }, [
      [new Date(2024, 0, 1), 'Mon'],
      [new Date(2024, 1, 1), 'Tue'],
    ]);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['Jan 2024', 'Feb 2024']);
  });

  it('shortens a number group the way a tick number is shortened', () => {
    const instance = axis({}, [
      [1_500_000, 'a'],
      [2_000, 'b'],
    ]);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['1.5M', '2000']);
  });

  it('formats a null group into whatever the formatter says, instead of the word null', () => {
    const instance = axis({ groupLabel: { formatter: ({ value }) => (value == null || value === '' ? '(empty)' : String(value)) } }, [
      [null, 'a'],
      ['Region', 'b'],
    ]);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['(empty)', 'Region']);
  });
});

describe('the group row takes its look from options', () => {
  it('defaults to the bold theme font in the foreground colour', () => {
    for (const node of groupLabels(axis({}))) {
      expect(node.fontSize).toBe(11);
      expect(node.fontWeight).toBe('bold');
      expect(node.fontFamily).toBe('sans-serif');
      expect(node.fill).toBe('#000');
    }
  });

  it('carries font, weight, family and colour through', () => {
    const instance = axis({ groupLabel: { fontSize: 14, fontWeight: 500, fontFamily: 'Inter', color: '#0f766e' } });

    for (const node of groupLabels(instance)) {
      expect(node.fontSize).toBe(14);
      expect(node.fontWeight).toBe('500');
      expect(node.fontFamily).toBe('Inter');
      expect(node.fill).toBe('#0f766e');
    }
  });

  it('grows the axis zone with the group font', () => {
    expect(axis({}).measure(measureText)).toBe(TICK_ZONE + ROW_SPACING + ROW_HEIGHT);
    expect(axis({ groupLabel: { fontSize: 20 } }).measure(measureText)).toBe(TICK_ZONE + ROW_SPACING + 25);
  });

  it('drops the row entirely with enabled: false — and stops reserving room for it', () => {
    const instance = axis({ groupLabel: { enabled: false } });

    expect(groupLabels(instance)).toHaveLength(0);
    expect(separators(instance)).toHaveLength(0);
    expect(instance.measure(measureText)).toBe(TICK_ZONE);
    // the item labels stay
    const axisLayer = capture();
    instance.render(axisLayer.layer, new Group(), plot);
    expect(axisLayer.nodes.map((node) => node.text)).toEqual(['Q1', 'Q2', 'Q1', 'Q2']);
  });
});

describe('a row per level of the tuple', () => {
  const nested = [
    ['2018', 'H1', 'Q1'],
    ['2018', 'H1', 'Q2'],
    ['2018', 'H2', 'Q3'],
    ['2019', 'H1', 'Q1'],
  ];

  it('draws every level between the item and the outermost group', () => {
    const instance = axis({}, nested);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['2018', '2019', 'H1', 'H2', 'H1']);
  });

  it('puts the outermost level furthest from the plot', () => {
    const instance = axis({}, nested);
    const edge = plot.y + plot.height;
    const rows = new Map(groupLabels(instance).map((node) => [node.text, node.y]));

    // the innermost row right after the tick labels, the next one a row further out
    expect(rows.get('H2')).toBe(edge + TICK_ZONE + ROW_SPACING);
    expect(rows.get('2019')).toBe(edge + TICK_ZONE + ROW_SPACING + ROW_HEIGHT + ROW_SPACING);
    expect(instance.measure(measureText)).toBe(TICK_ZONE + 2 * (ROW_SPACING + ROW_HEIGHT));
  });

  it('never lets a run at one level span two groups of the level above it', () => {
    const instance = axis({}, [
      ['A', 'x', '1'],
      ['B', 'x', '2'],
    ]);

    // the same 'x' twice: it belongs to A and to B, and those are two groups
    expect(groupLabels(instance).map((node) => node.text)).toEqual(['A', 'B', 'x', 'x']);
  });

  it('gives a boundary one separator, as long as the outermost level that has it', () => {
    const instance = axis({}, nested);
    const lines = separators(instance);
    const edge = plot.y + plot.height;
    const innerRow = edge + TICK_ZONE + ROW_SPACING;
    const outerRow = innerRow + ROW_HEIGHT + ROW_SPACING;

    // two boundaries in the domain, one line each — no doubling where the levels agree
    expect(lines).toHaveLength(2);
    // H1 → H2 is a boundary of the inner row only; 2018 → 2019 is one of both, and runs to the outer row
    expect(lines.map((line) => line.y2).sort((a, b) => a - b)).toEqual([innerRow + 10, outerRow + 10]);
  });
});

describe('groups are runs of equal values, not of equal text', () => {
  it('keeps null and the string null apart', () => {
    const instance = axis({ groupLabel: { formatter: ({ value }) => (value === null ? 'nothing' : String(value)) } }, [
      [null, 'a'],
      ['null', 'b'],
    ]);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['nothing', 'null']);
    expect(separators(instance)).toHaveLength(1);
  });

  it('keeps a number and its digits apart', () => {
    const instance = axis({}, [
      [1, 'a'],
      ['1', 'b'],
    ]);

    expect(separators(instance)).toHaveLength(1);
  });

  it('still joins two dates standing for the same moment', () => {
    const instance = axis({ groupLabel: { format: '%Y' } }, [
      [new Date(2024, 0, 1), 'a'],
      [new Date(2024, 0, 1), 'b'],
    ]);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['2024']);
  });
});

describe('group names never reach past the ends of the axis', () => {
  it('asks for no room outside the plot: a name lives inside its own run', () => {
    const name = 'A group name that runs past the end of the plot rect';
    const instance = axis({}, [[name, 'only']]);

    expect(instance.labelOverflow(measureText, plot)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('asks for nothing once the row is switched off', () => {
    const instance = axis({ groupLabel: { enabled: false } }, [['A group name that runs past the end of the plot rect', 'only']]);

    expect(instance.labelOverflow(measureText, plot)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
});

describe('group names cut to the run they stand over', () => {
  /**
   * Each group covers two of the four bands — 180 px of a 400 px axis. Rendering
   * measures without a canvas, 0.6 · 11 px = 6.6 px per character.
   */
  const wordy = { formatter: ({ value }: { value: unknown }) => `Financial year ${String(value)} (audited)` };

  it('drops a name wider than its run rather than drawing it over the group next door', () => {
    expect(groupLabels(axis({ groupLabel: wordy }))).toHaveLength(0);
  });

  it('draws the whole name while the run it stands over holds it', () => {
    expect(groupLabels(axis({ groupLabel: { formatter: ({ value }) => `FY ${String(value)}` } })).map((node) => node.text)).toEqual([
      'FY 2018',
      'FY 2019',
    ]);
  });

  it('holds the name inside its run when the axis cuts its labels', () => {
    const cut = axis({ label: { overflow: 'ellipsis' }, groupLabel: wordy });

    expect(groupLabels(cut).map((node) => node.text)).toEqual(['Financial year 2018 (audi..', 'Financial year 2019 (audi..']);
  });

  it('takes the cut mark from label.ellipsis, like the tick labels do', () => {
    const cut = axis({ label: { overflow: 'ellipsis', ellipsis: '…' }, groupLabel: wordy });

    expect(groupLabels(cut)[0]?.text).toBe('Financial year 2018 (audit…');
  });

  it('cuts to groupLabel.maxWidth whether or not the axis is crowded', () => {
    const capped = axis({ groupLabel: { ...wordy, maxWidth: 40 } });

    // 4 characters of 6.6 px plus the two dots of the mark is all 40 px hold
    expect(groupLabels(capped)[0]?.text).toBe('Fina..');
  });

  it('asks for no room past the ends of the axis once the names are cut', () => {
    const name = 'A group name that runs past the end of the plot rect';
    const instance = axis({ label: { overflow: 'ellipsis' } }, [[name, 'only']]);

    expect(instance.labelOverflow(measureText, plot)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('drops a name its run cannot hold instead of cutting it past its own characters', () => {
    // 30 categories on a 400 px axis leave the one-category group about 10 px — less than the mark itself
    const crowded = Array.from({ length: 30 }, (_, index) => [index === 0 ? 'Solo' : 'Rest', `item ${index}`]);
    const instance = axis({ label: { overflow: 'ellipsis' } }, crowded);

    expect(groupLabels(instance).map((node) => node.text)).toEqual(['Rest']);
  });
});

describe('a row of group names thins the way a row of labels does', () => {
  /** Eight one-category groups on a 400 px axis: each name is wider than the run under it. */
  const many = Array.from({ length: 8 }, (_, index) => [`Group number ${index}`, `item ${index}`]);

  it('drops the names no run of its own can hold', () => {
    expect(groupLabels(axis({}, many))).toHaveLength(0);
  });

  it('cuts instead of thinning while the cut still leaves characters of its own', () => {
    const names = groupLabels(axis({ label: { overflow: 'ellipsis' } }, many)).map((node) => node.text);

    expect(names).toHaveLength(many.length);
    for (const name of names) expect(name).toMatch(/^Grou/);
  });

  it('keeps the separators of the runs whose names had to go', () => {
    expect(separators(axis({}, many))).toHaveLength(many.length - 1);
  });
});

describe('crowded labels are thinned run by run', () => {
  /** Names too wide for two to share a run of three: only the middle one is drawn. */
  const wide = [
    ['H1', 'Strawberry jam'],
    ['H1', 'Blueberry pie'],
    ['H1', 'Raspberry tart'],
    ['H2', 'Blackcurrant'],
    ['H2', 'Gooseberry fool'],
    ['H2', 'Elderflower'],
  ];

  it('keeps the middle label of a run rather than every third label of the axis', () => {
    expect(tickLabels(axis({}, wide)).map((node) => node.text)).toEqual(['Blueberry pie', 'Gooseberry fool']);
  });

  it('leaves a run label-less when even its own label overhangs the run', () => {
    // 'Solo' covers one band of seven — far less than the name of its only category
    const lopsided = [['Solo', 'Strawberry jam'], ...wide];

    expect(tickLabels(axis({}, lopsided)).map((node) => node.text)).not.toContain('Strawberry jam');
  });

  it('keeps the label of a narrow run when that label is short enough for it', () => {
    const lopsided = [['Solo', 'Fig'], ...wide];

    expect(tickLabels(axis({}, lopsided)).map((node) => node.text)).toContain('Fig');
  });

  it('keeps every label of a run that has room for them all', () => {
    const roomy = wide.map(([group, item]) => [group, String(item).slice(0, 3)]);

    expect(tickLabels(axis({}, roomy))).toHaveLength(6);
  });
});

describe('a group covers the label rows of its own categories', () => {
  /** Group names on a vertical axis are the ones turned on their side. */
  const sideways = (instance: GroupedCategoryAxis): Text[] => {
    const axisLayer = capture();
    instance.render(axisLayer.layer, new Group(), plot);
    return axisLayer.nodes.filter((node) => node.rotation === -90);
  };

  it('centres the name on its bands when the labels sit beside the axis', () => {
    const instance = axis({}, domain, 'left');
    const scale = instance.scale;

    expect(sideways(instance)[0]?.y).toBeCloseTo((scale.convert(domain[0]) + scale.convert(domain[1]) + scale.bandwidth) / 2, 6);
  });

  it('takes in the row above the first band when the labels sit inside', () => {
    const instance = axis({ label: { placement: 'inside' } }, domain, 'left');
    const scale = instance.scale;
    // the gap above a band holds that band's label, so it belongs to the band's own group
    const lead = scale.stepSize - scale.bandwidth;
    const top = scale.convert(domain[0]) - lead;

    expect(lead).toBeGreaterThan(0);
    expect(sideways(instance)[0]?.y).toBeCloseTo((top + scale.convert(domain[1]) + scale.bandwidth) / 2, 6);
  });

  it('centres a following name between the separator above it and its last band', () => {
    const instance = axis({ label: { placement: 'inside' } }, domain, 'left');
    const axisLayer = capture();
    instance.render(axisLayer.layer, new Group(), plot);
    const separator = axisLayer.lines.find((line) => line.y1 === line.y2);
    const scale = instance.scale;
    const bottom = scale.convert(domain[3]) + scale.bandwidth;

    expect(separator?.y1).toBeCloseTo(scale.convert(domain[1]) + scale.bandwidth, 6);
    expect(sideways(instance)[1]?.y).toBeCloseTo((separator!.y1 + bottom) / 2, 6);
  });
});

describe('tilted labels and the runs they belong to', () => {
  /** Names too wide for two to share a run of three: level, only the middle one is drawn. */
  const wide = [
    ['H1', 'Strawberry jam'],
    ['H1', 'Blueberry pie'],
    ['H1', 'Raspberry tart'],
    ['H2', 'Blackcurrant'],
    ['H2', 'Gooseberry fool'],
    ['H2', 'Elderflower'],
  ];

  /** Every line reaching below the axis line — the separators, and nothing else here. */
  function strokes(instance: GroupedCategoryAxis): Line[] {
    const axisLayer = capture();
    instance.render(axisLayer.layer, new Group(), plot);
    const edge = plot.y + plot.height;
    return axisLayer.lines.filter((line) => line.y1 >= edge && line.y2 > edge);
  }

  it('keeps every name a run would have dropped', () => {
    // a tilted label ends at its own tick, so it is never read as the run next door's
    expect(tickLabels(axis({ label: { rotation: -45 } }, wide)).map((node) => node.text)).toEqual(wide.map(([, item]) => item));
  });

  it('still thins by the room the tilt needs where the ticks crowd', () => {
    const many = Array.from({ length: 40 }, (_, index) => ['H1', `Item ${index}`]);
    const drawn = tickLabels(axis({ label: { rotation: -45 } }, many));

    // a 10 px step and 23.5 px of room per tilted label: every third one, evenly
    // along the axis rather than gathered in the middle of the run
    expect(drawn.map((node) => node.text)).toEqual(many.filter((_, index) => index % 3 === 0).map(([, item]) => item));
  });

  it('leans the separator with the labels and stands it up again for the group names', () => {
    const instance = axis({ label: { rotation: -45 } }, wide);
    const tilted = strokes(instance);
    const upright = tilted.filter((line) => line.x1 === line.x2);
    const leaning = tilted.filter((line) => line.x1 !== line.x2);
    const edge = plot.y + plot.height;

    // one boundary: leaning where the names lean, upright where the group names read
    expect(upright).toHaveLength(1);
    expect(leaning).toHaveLength(1);
    // it starts where the labels are hung, not at the axis line — a stroke
    // level with the row of names would run along the very text it separates
    expect(leaning[0]!.y1).toBeGreaterThan(edge);
    // parallel to the labels: as far along the axis as it goes across, at 45°
    expect(leaning[0]!.x2 - leaning[0]!.x1).toBeCloseTo(-(leaning[0]!.y2 - leaning[0]!.y1), 6);
    // and the upright one carries on from where the leaning one ends
    expect(upright[0]!.x1).toBeCloseTo(leaning[0]!.x2, 6);
    expect(upright[0]!.y1).toBeCloseTo(leaning[0]!.y2, 6);
  });

  it('never lets the separator run along the labels it keeps apart', () => {
    const instance = axis({ label: { rotation: -45 } }, wide);
    const leaning = strokes(instance).filter((line) => line.x1 !== line.x2)[0]!;
    const drawn = tickLabels(instance);
    // the strips are parallel, so what keeps them clear of each other is the
    // distance across: at least half a glyph row, or the line crosses the text
    for (const label of drawn) {
      const across = Math.abs((leaning.x1 - label.x) * Math.SQRT1_2 + (leaning.y1 - label.y) * Math.SQRT1_2);
      expect(across).toBeGreaterThan(11 / 2);
    }
  });

  it('carries the group names along with the lean, each over the names it heads', () => {
    const level = groupLabels(axis({}, wide));
    const tilted = groupLabels(axis({ label: { rotation: -45 } }, wide));
    const leaning = strokes(axis({ label: { rotation: -45 } }, wide)).filter((line) => line.x1 !== line.x2)[0]!;
    const drift = leaning.x2 - leaning.x1;

    expect(tilted.map((node) => node.text)).toEqual(level.map((node) => node.text));
    for (const [index, node] of tilted.entries()) expect(node.x).toBeCloseTo(level[index]!.x + drift, 6);
  });

  it('keeps the separator upright all the way while the labels are level', () => {
    const level = strokes(axis({}, wide));

    expect(level.filter((line) => line.x1 !== line.x2)).toHaveLength(0);
    expect(level.filter((line) => line.x1 === line.x2)[0]?.y1).toBe(plot.y + plot.height);
  });
});
