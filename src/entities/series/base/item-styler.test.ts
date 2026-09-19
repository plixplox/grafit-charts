import { styleMarkerItem, styleRectItem, type RectItemStylerParams } from './item-styler';
import { describe, expect, it } from 'vitest';

const params: RectItemStylerParams = { datum: { v: -1 }, index: 0, highlighted: false, fill: '#436ff4', stroke: undefined };

describe('the style of a rectangle', () => {
  it('is nothing without a styler, or where the styler has nothing to say', () => {
    expect(styleRectItem(undefined, params)).toEqual({});
    expect(styleRectItem(() => undefined, params)).toEqual({});
  });

  it('is what the styler returns for an item at rest', () => {
    expect(styleRectItem(() => ({ fill: 'red' }), params)).toEqual({ fill: 'red' });
  });

  it('keeps the rest colours under the pointer when the styler ignores the highlight', () => {
    const styler = ({ highlighted }: RectItemStylerParams) => (highlighted ? undefined : { fill: 'red', label: { color: 'white' } });
    expect(styleRectItem(styler, { ...params, highlighted: true })).toEqual({ fill: 'red', label: { color: 'white' } });
  });

  it('builds the highlighted style on the colours it gave at rest', () => {
    const seen: string[] = [];
    const styler = ({ highlighted, fill }: RectItemStylerParams) => {
      seen.push(`${highlighted}:${String(fill)}`);
      return highlighted ? { stroke: 'black', label: { color: 'yellow' } } : { fill: 'red', label: { color: 'white' } };
    };
    expect(styleRectItem(styler, { ...params, highlighted: true })).toEqual({
      fill: 'red',
      stroke: 'black',
      label: { color: 'yellow' },
    });
    expect(seen).toEqual(['false:#436ff4', 'true:red']);
  });
});

describe('the style of a marker', () => {
  const marker = { ...params, size: 8 };

  it('grows under the pointer from the size the styler gave it at rest', () => {
    expect(styleMarkerItem(({ highlighted }) => (highlighted ? undefined : { size: 10 }), { ...marker, highlighted: true }, 1.5)).toEqual({
      size: 15,
    });
  });

  it('keeps its size at rest', () => {
    expect(styleMarkerItem(undefined, marker, 1.5)).toEqual({ size: 8 });
  });

  it('takes a size the styler gives the highlighted marker as it is', () => {
    expect(styleMarkerItem(({ highlighted }) => (highlighted ? { size: 20 } : undefined), { ...marker, highlighted: true }, 1.5).size).toBe(
      20,
    );
  });
});
