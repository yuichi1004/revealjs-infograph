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

  it('has no icon — the shorthand has no attribute space for a fourth fact', () => {
    expect(parseItemList('A, B').every((item) => item.icon === null)).toBe(true);
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

  it('is null for a child with no icon', () => {
    const node = host('<div data-item="A"></div>');
    expect(readItems(node, 'item')[0].icon).toBeNull();
  });

  it('resolves data-icon on a child into a node', () => {
    const node = host('<div data-item="A" data-icon="check"></div>');
    const icon = readItems(node, 'item')[0].icon;
    expect(icon).not.toBeNull();
    expect(icon.classList.contains('ig-icon')).toBe(true);
  });

  it('excludes an inline icon subtree from the derived note', () => {
    const node = host(
      '<div data-step="課題"><svg data-icon viewBox="0 0 24 24"><circle r="10"/></svg>分断されたチーム</div>',
    );
    expect(readItems(node, 'step')[0]).toMatchObject({ label: '課題', note: '分断されたチーム' });
  });

  it('leaves the authored inline <svg> in place — the icon is a clone', () => {
    const node = host(
      '<div data-item="A"><svg data-icon viewBox="0 0 24 24"><circle r="10"/></svg></div>',
    );
    const source = node.querySelector('svg');
    const [item] = readItems(node, 'item');
    expect(node.contains(source)).toBe(true);
    expect(item.icon.contains(source)).toBe(false);
  });

  it('ignores children that are not marked with the form key', () => {
    const node = host('<div data-item="A"></div><span>noise</span>');
    expect(readItems(node, 'item')).toHaveLength(1);
  });

  describe('falls back to a plain list', () => {
    it('reads <li> text as the label, in document order', () => {
      const node = host('<ul><li>Esteem</li><li>Safety needs</li></ul>');
      expect(readItems(node, 'item').map((i) => i.label)).toEqual(['Esteem', 'Safety needs']);
    });

    it('reads an <ol> the same way', () => {
      const node = host('<ol><li>First</li><li>Second</li></ol>');
      expect(readItems(node, 'item').map((i) => i.label)).toEqual(['First', 'Second']);
    });

    it('honours data-value and data-emphasis on the <li> itself', () => {
      const node = host('<ul><li data-value="34" data-emphasis>Remote</li></ul>');
      const [item] = readItems(node, 'item');
      expect(item).toMatchObject({ label: 'Remote', emphasis: true });
      expect(item.number).toMatchObject({ value: 34, valid: true });
    });

    it('honours data-icon on the <li> itself, in every branch of the label logic', () => {
      const node = host(`<ul>
        <li data-value="34" data-icon="check">Remote</li>
        <li data-icon="flag">Office: 52</li>
        <li data-icon="clock">No number here</li>
      </ul>`);
      const items = readItems(node, 'item');
      expect(items.every((item) => item.icon?.classList.contains('ig-icon'))).toBe(true);
    });

    it('splits "label: value" only when the remainder is really a number', () => {
      const node = host('<ul><li>Remote: 34</li></ul>');
      const [item] = readItems(node, 'item');
      expect(item.label).toBe('Remote');
      expect(item.number).toMatchObject({ value: 34, valid: true });
    });

    it('keeps a colon that is not followed by a number as part of the label', () => {
      // The whole point of the "does it parse" check: prose must not be
      // misread as data just because it contains a colon.
      const node = host('<ul><li>Safety: the foundation of the rest</li></ul>');
      const [item] = readItems(node, 'item');
      expect(item.label).toBe('Safety: the foundation of the rest');
      expect(item.number.valid).toBe(false);
    });

    it('does not flatten a nested list inside one item', () => {
      const node = host('<ul><li>Top<ul><li>Nested</li></ul></li><li>Bottom</li></ul>');
      expect(readItems(node, 'item')).toHaveLength(2);
    });

    it('yields to data-* children when both are present', () => {
      const node = host('<div data-item="A"></div><ul><li>B</li></ul>');
      expect(readItems(node, 'item').map((i) => i.label)).toEqual(['A']);
    });

    it('yields to the <li> list over the data-items shorthand', () => {
      const node = host('<ul><li>A</li></ul>');
      node.dataset.items = 'B: 2';
      expect(readItems(node, 'item').map((i) => i.label)).toEqual(['A']);
    });
  });
});

describe('applyEmphasis', () => {
  it('resolves a 1-based index from the host attribute', () => {
    const items = parseItemList('A: 1, B: 2, C: 3');
    expect(applyEmphasis(items, '2').map((i) => i.emphasis)).toEqual([false, true, false]);
  });

  it('resolves a comma-separated list of 1-based indices', () => {
    const items = parseItemList('A: 1, B: 2, C: 3, D: 4');
    expect(applyEmphasis(items, '2,4').map((i) => i.emphasis)).toEqual([false, true, false, true]);
  });

  it('accepts full-width commas between indices', () => {
    const items = parseItemList('A: 1, B: 2, C: 3, D: 4');
    expect(applyEmphasis(items, '1、3').map((i) => i.emphasis)).toEqual([true, false, true, false]);
  });

  it('keeps every marked child, not just the first', () => {
    const items = parseItemList('A: 1, B: 2, C: 3');
    items[0].emphasis = true;
    items[2].emphasis = true;
    expect(applyEmphasis(items, undefined).map((i) => i.emphasis)).toEqual([true, false, true]);
  });

  it('ignores an out-of-range index rather than throwing', () => {
    const items = parseItemList('A: 1');
    expect(applyEmphasis(items, '9').map((i) => i.emphasis)).toEqual([false]);
  });

  it('ignores an out-of-range index within a list without dropping the valid ones', () => {
    const items = parseItemList('A: 1, B: 2');
    expect(applyEmphasis(items, '1,9').map((i) => i.emphasis)).toEqual([true, false]);
  });
});
