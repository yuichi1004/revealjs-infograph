import { describe, it, expect } from 'vitest';
import {
  parseNumber,
  formatNumber,
  parseItemList,
  readItems,
  applyEmphasis,
} from '../src/parse.js';

describe('parseNumber', () => {
  it('keeps the author formatting it reads', () => {
    expect(parseNumber('43.8%')).toMatchObject({
      value: 43.8,
      decimals: 1,
      suffix: '%',
      percent: true,
      valid: true,
    });
  });

  it('reads grouped thousands without losing the separator', () => {
    const spec = parseNumber('1,204');
    expect(spec.value).toBe(1204);
    expect(spec.grouped).toBe(true);
    expect(formatNumber(1204, spec)).toBe('1,204');
  });

  it('remembers an explicit plus sign', () => {
    const spec = parseNumber('+12');
    expect(spec.value).toBe(12);
    expect(spec.plus).toBe(true);
    expect(formatNumber(12, spec)).toBe('+12');
  });

  it('splits prefix and suffix around the digits', () => {
    expect(parseNumber('¥1,234万')).toMatchObject({ prefix: '¥', suffix: '万', value: 1234 });
  });

  it('handles units that are not percent signs', () => {
    expect(parseNumber('18日')).toMatchObject({ value: 18, suffix: '日', percent: false });
  });

  it('degrades instead of throwing on text with no number', () => {
    expect(parseNumber('たくさん')).toMatchObject({ valid: false, text: 'たくさん' });
    expect(parseNumber(undefined)).toMatchObject({ valid: false, text: '' });
  });

  it('round-trips a derived value through the original format', () => {
    const spec = parseNumber('43.8%');
    expect(formatNumber(56.2, spec)).toBe('56.2%');
  });

  it('formats negatives with a real minus, not the authored plus', () => {
    const spec = parseNumber('+12日');
    expect(formatNumber(-12, spec)).toBe('-12日');
  });
});

describe('parseItemList', () => {
  it('reads the label: value shorthand', () => {
    const items = parseItemList('在宅: 34, 出社: 52');
    expect(items.map((i) => i.label)).toEqual(['在宅', '出社']);
    expect(items.map((i) => i.number.value)).toEqual([34, 52]);
  });

  it('accepts full-width punctuation, which is what a Japanese IME produces', () => {
    const items = parseItemList('在宅：34、出社：52');
    expect(items.map((i) => i.label)).toEqual(['在宅', '出社']);
    expect(items.map((i) => i.number.value)).toEqual([34, 52]);
  });

  it('allows label-only entries', () => {
    const items = parseItemList('課題, 介入, 結果');
    expect(items).toHaveLength(3);
    expect(items[0].number.valid).toBe(false);
  });

  it('is empty for empty input', () => {
    expect(parseItemList('')).toEqual([]);
    expect(parseItemList(undefined)).toEqual([]);
  });
});

describe('readItems', () => {
  /** @param {string} html */
  const host = (html) => {
    const node = document.createElement('div');
    node.innerHTML = html;
    return node;
  };

  it('prefers child elements over the shorthand when both are present', () => {
    const node = host('<div data-item="A" data-value="1"></div>');
    node.dataset.items = 'B: 2';
    expect(readItems(node, 'item').map((i) => i.label)).toEqual(['A']);
  });

  it('uses a child element text as its note', () => {
    const node = host('<div data-step="課題">分断されたチーム</div>');
    expect(readItems(node, 'step')[0]).toMatchObject({ label: '課題', note: '分断されたチーム' });
  });

  it('ignores children that are not marked with the form key', () => {
    const node = host('<div data-item="A"></div><span>noise</span>');
    expect(readItems(node, 'item')).toHaveLength(1);
  });
});

describe('applyEmphasis', () => {
  it('resolves a 1-based index from the host attribute', () => {
    const items = parseItemList('A: 1, B: 2, C: 3');
    expect(applyEmphasis(items, '2').map((i) => i.emphasis)).toEqual([false, true, false]);
  });

  it('keeps only the first of several marked children', () => {
    const items = parseItemList('A: 1, B: 2, C: 3');
    items[0].emphasis = true;
    items[2].emphasis = true;
    expect(applyEmphasis(items, undefined).map((i) => i.emphasis)).toEqual([true, false, false]);
  });

  it('ignores an out-of-range index rather than throwing', () => {
    const items = parseItemList('A: 1');
    expect(applyEmphasis(items, '9').map((i) => i.emphasis)).toEqual([false]);
  });
});
