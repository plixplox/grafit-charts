import { collectFontUsage, FontWatcher, watchDocumentFonts } from './fonts';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeFonts {
  check: (spec: string) => boolean;
  load: (spec: string) => Promise<unknown[]>;
  forEach?: (visit: (face: { family: string; status: string }) => void) => void;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function stubFonts(fonts: FakeFonts): void {
  vi.stubGlobal('document', { fonts: { forEach: () => undefined, ...fonts } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('collectFontUsage', () => {
  it('picks up families and weights anywhere in the options tree', () => {
    const usage = collectFontUsage({
      theme: { params: { fontFamily: 'Inter' } },
      series: [{ type: 'bar', label: { fontFamily: 'Roboto', fontWeight: 600 } }],
    });
    expect([...usage.families]).toEqual(['Inter', 'Roboto']);
    expect(usage.weights).toContain('600');
    // normal and bold are probed for every family
    expect([...usage.weights]).toEqual(expect.arrayContaining(['normal', 'bold']));
  });

  it('skips datum arrays and non-plain objects', () => {
    class Container {
      fontFamily = 'FromDom';
    }
    const usage = collectFontUsage({
      container: new Container(),
      data: [{ fontFamily: 'FromDatum' }],
      title: { fontFamily: 'Inter' },
    });
    expect([...usage.families]).toEqual(['Inter']);
  });
});

describe('FontWatcher.request', () => {
  it('does nothing without a font set (Node, older browsers)', async () => {
    vi.stubGlobal('document', undefined);
    await expect(new FontWatcher().request({ title: { fontFamily: 'Inter' } })).resolves.toBe(false);
  });

  it('skips families the browser already has', async () => {
    const load = vi.fn();
    stubFonts({ check: () => true, load });
    await expect(new FontWatcher().request({ title: { fontFamily: 'Inter' } })).resolves.toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it('loads the missing family and reports that a redraw is due', async () => {
    const load = vi.fn(() => Promise.resolve([{}]));
    stubFonts({ check: () => false, load });
    await expect(new FontWatcher().request({}, 'Inter')).resolves.toBe(true);
    expect(load).toHaveBeenCalledWith('normal 16px Inter');
    expect(load).toHaveBeenCalledWith('bold 16px Inter');
  });

  it('reports no redraw when the family has no face to load', async () => {
    stubFonts({ check: () => false, load: () => Promise.resolve([]) });
    await expect(new FontWatcher().request({}, 'Nonexistent')).resolves.toBe(false);
  });

  it('survives a spec the browser refuses to parse', async () => {
    stubFonts({
      check: () => {
        throw new SyntaxError('bad font shorthand');
      },
      load: () => Promise.reject(new SyntaxError('bad font shorthand')),
    });
    await expect(new FontWatcher().request({}, '"unbalanced')).resolves.toBe(false);
  });
});

describe('FontWatcher.recheck', () => {
  it('reports a face the page declared after the request', async () => {
    const faces: { family: string; status: string }[] = [];
    stubFonts({
      check: () => true,
      load: () => Promise.resolve([]),
      forEach: (visit) => faces.forEach(visit),
    });
    const watcher = new FontWatcher();

    // the family did not exist yet: nothing to load, nothing to draw
    await expect(watcher.request({}, 'Lazy, sans-serif')).resolves.toBe(false);
    expect(watcher.recheck()).toBe(false);

    // a lazily added @font-face has since arrived
    faces.push({ family: '"Lazy"', status: 'loaded' });
    expect(watcher.recheck()).toBe(true);
    // and only once — the face is accounted for now
    expect(watcher.recheck()).toBe(false);
  });

  it('ignores faces of other families and faces still loading', async () => {
    const faces: { family: string; status: string }[] = [];
    stubFonts({
      check: () => true,
      load: () => Promise.resolve([]),
      forEach: (visit) => faces.forEach(visit),
    });
    const watcher = new FontWatcher();
    await watcher.request({}, 'Lazy');

    faces.push({ family: 'Unrelated', status: 'loaded' }, { family: 'Lazy', status: 'loading' });
    expect(watcher.recheck()).toBe(false);
  });

  it('stays quiet for faces the request itself has loaded', async () => {
    const face = { family: 'Inter', status: 'unloaded' };
    const faces = [face];
    stubFonts({
      check: () => false,
      load: () => {
        face.status = 'loaded';
        return Promise.resolve([{}]);
      },
      forEach: (visit) => faces.forEach(visit),
    });
    const watcher = new FontWatcher();
    await expect(watcher.request({}, 'Inter')).resolves.toBe(true);
    expect(watcher.recheck()).toBe(false);
  });

  it('reports nothing before a request', () => {
    stubFonts({ check: () => true, load: () => Promise.resolve([]) });
    expect(new FontWatcher().recheck()).toBe(false);
  });
});

describe('watchDocumentFonts', () => {
  it('subscribes to loadingdone and unsubscribes on demand', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    stubFonts({ check: () => true, load: () => Promise.resolve([]), addEventListener, removeEventListener });

    const listener = vi.fn();
    const unwatch = watchDocumentFonts(listener);
    expect(addEventListener).toHaveBeenCalledWith('loadingdone', listener);

    unwatch();
    expect(removeEventListener).toHaveBeenCalledWith('loadingdone', listener);
  });

  it('is a no-op without a font set', () => {
    vi.stubGlobal('document', undefined);
    expect(() => watchDocumentFonts(() => undefined)()).not.toThrow();
  });
});
