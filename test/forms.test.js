import { describe, it, expect } from 'vitest';
import { render, text, all, warnings } from './helpers/mount.js';
import { formNames, registerForm } from '../src/forms/index.js';
import { WAFFLE } from '../src/design/tokens.js';
import { SYMBOLS, resolveSymbol, symbolUrl } from '../src/design/symbols.js';

describe('stat', () => {
  it('prints the value exactly as authored', () => {
    const figure = render(
      '<div data-infograph="stat" data-value="43.8%" data-label="回答者が同意"></div>',
    );
    expect(text(figure, '.ig-stat-value')).toBe('43.8%');
    expect(text(figure, '.ig-stat-label')).toBe('回答者が同意');
  });

  it('names the figure with both the number and its meaning', () => {
    const figure = render(
      '<div data-infograph="stat" data-value="43.8%" data-label="回答者が同意"></div>',
    );
    expect(figure.getAttribute('aria-label')).toBe('43.8% — 回答者が同意');
  });

  it('omits the note and caption when not given', () => {
    const figure = render('<div data-infograph="stat" data-value="12" data-label="件"></div>');
    expect(figure.querySelector('.ig-stat-note')).toBeNull();
    expect(figure.querySelector('.ig-caption')).toBeNull();
  });

  it('carries no hidden table — its visible text already reads correctly', () => {
    const figure = render('<div data-infograph="stat" data-value="12" data-label="件"></div>');
    expect(figure.querySelector('table')).toBeNull();
  });

  it('advises when a number has no stated referent', () => {
    render('<div data-infograph="stat" data-value="43.8%"></div>');
    expect(warnings().join()).toMatch(/no data-label/);
  });
});

describe('waffle', () => {
  it('always emits a full grid, so the denominator is visible', () => {
    const figure = render('<div data-infograph="waffle" data-value="43.8%"></div>');
    expect(all(figure, '.ig-waffle-cell')).toHaveLength(WAFFLE.total);
  });

  it('rounds the fill to the nearest cell but prints the exact value', () => {
    const figure = render(
      '<div data-infograph="waffle" data-value="43.8%" data-label="同意"></div>',
    );
    expect(all(figure, '.ig-waffle-cell-on')).toHaveLength(44);
    expect(text(figure, '.ig-waffle-value')).toBe('43.8%');
  });

  it('reads a bare count against an explicit total', () => {
    const figure = render('<div data-infograph="waffle" data-value="250" data-total="1000"></div>');
    expect(all(figure, '.ig-waffle-cell-on')).toHaveLength(25);
  });

  it('states the share and its complement in the hidden table', () => {
    const figure = render(
      '<div data-infograph="waffle" data-value="43.8%" data-label="同意"></div>',
    );
    const rows = all(figure, 'tbody tr').map((r) => r.textContent);
    expect(rows[0]).toContain('43.8%');
    expect(rows[1]).toContain('56.2%');
  });

  it('hides the grid from assistive tech, since the table says the same thing', () => {
    const figure = render('<div data-infograph="waffle" data-value="10%"></div>');
    expect(figure.querySelector('.ig-waffle-grid')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('clamps an out-of-range share and says so', () => {
    const figure = render('<div data-infograph="waffle" data-value="140%"></div>');
    expect(all(figure, '.ig-waffle-cell-on')).toHaveLength(WAFFLE.total);
    expect(warnings().join()).toMatch(/outside 0–100%/);
  });
});

describe('bar', () => {
  const twoBars = '<div data-infograph="bar" data-items="在宅: 34, 出社: 52"></div>';

  it('scales lengths against the largest value from a zero baseline', () => {
    const figure = render(twoBars);
    const lengths = all(figure, '.ig-bar-fill').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-bar-length'),
    );
    expect(lengths[1]).toBe('100%');
    expect(lengths[0]).toBe(`${(34 / 52) * 100}%`);
  });

  it('direct-labels every bar instead of emitting a legend', () => {
    const figure = render(twoBars);
    expect(all(figure, '.ig-bar-name').map((el) => el.textContent)).toEqual(['在宅', '出社']);
    expect(figure.querySelector('.ig-legend')).toBeNull();
  });

  it('gives every bar the same colour when nothing is emphasised', () => {
    const figure = render(twoBars);
    const fills = all(figure, '.ig-bar-fill').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-bar-fill'),
    );
    expect(new Set(fills).size).toBe(1);
  });

  it('grays the rest when one bar is emphasised', () => {
    const figure = render(
      '<div data-infograph="bar" data-emphasis="2" data-items="在宅: 34, 出社: 52"></div>',
    );
    const fills = all(figure, '.ig-bar-fill').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-bar-fill'),
    );
    expect(fills).toEqual(['var(--ig-muted)', 'var(--ig-mark-1)']);
  });

  it('reads child elements as items', () => {
    const figure = render(`
      <div data-infograph="bar">
        <div data-item="在宅" data-value="34"></div>
        <div data-item="出社" data-value="52" data-emphasis></div>
      </div>`);
    expect(all(figure, '.ig-bar-row')).toHaveLength(2);
    expect(all(figure, '.ig-bar-row-on')).toHaveLength(1);
  });

  it('advises when the bars are really a part-of-whole story', () => {
    render('<div data-infograph="bar" data-items="A: 40, B: 60"></div>');
    expect(warnings().join()).toMatch(/sum to 100/);
  });

  it('advises past the working-memory ceiling', () => {
    render('<div data-infograph="bar" data-items="A: 1, B: 2, C: 3, D: 4, E: 5, F: 6"></div>');
    expect(warnings().join()).toMatch(/hard to hold in mind/);
  });
});

describe('flow', () => {
  const steps = `
    <div data-infograph="flow">
      <div data-step="課題">分断されたチーム</div>
      <div data-step="介入">文化統合</div>
      <div data-step="結果">+43.8%</div>
    </div>`;

  it('puts a connector between every pair of steps, and none at the ends', () => {
    const figure = render(steps);
    expect(all(figure, '.ig-flow-step')).toHaveLength(3);
    expect(all(figure, '.ig-flow-arrow')).toHaveLength(2);
  });

  it('hides connectors from assistive tech — DOM order already says "then"', () => {
    const figure = render(steps);
    for (const arrow of all(figure, '.ig-flow-arrow')) {
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('names the figure as the sequence it draws', () => {
    expect(render(steps).getAttribute('aria-label')).toBe('課題 → 介入 → 結果');
  });

  it('segments into reveal fragments only when asked', () => {
    expect(all(render(steps), '.fragment')).toHaveLength(0);
    const fragmented = render(
      steps.replace('data-infograph="flow"', 'data-infograph="flow" data-ig-fragment="steps"'),
    );
    expect(all(fragmented, '.ig-flow-step.fragment')).toHaveLength(3);
    expect(
      all(fragmented, '[data-fragment-index]').map((el) => el.getAttribute('data-fragment-index')),
    ).toEqual(['0', '1', '2']);
  });

  it('advises when there is no sequence to draw', () => {
    render('<div data-infograph="flow"><div data-step="唯一"></div></div>');
    expect(warnings().join()).toMatch(/at least two steps/);
  });
});

describe('compare', () => {
  const beforeAfter = `
    <div data-infograph="compare" data-label="平均リードタイム">
      <div data-item="導入前" data-value="18日"></div>
      <div data-item="導入後" data-value="6日"></div>
    </div>`;

  it('states the delta the audience would otherwise compute silently', () => {
    const figure = render(beforeAfter);
    expect(text(figure, '.ig-compare-delta')).toBe('-12日  /  -66.7%');
  });

  it('emphasises the second value by default', () => {
    const figure = render(beforeAfter);
    const sides = all(figure, '.ig-compare-side');
    expect(sides[0].classList.contains('ig-compare-side-on')).toBe(false);
    expect(sides[1].classList.contains('ig-compare-side-on')).toBe(true);
  });

  it('moves the emphasis when told to', () => {
    const figure = render(beforeAfter.replace('data-label', 'data-emphasis="1" data-label'));
    expect(all(figure, '.ig-compare-side')[0].classList.contains('ig-compare-side-on')).toBe(true);
  });

  it('omits the percentage when the baseline is zero', () => {
    const figure = render(`
      <div data-infograph="compare">
        <div data-item="前" data-value="0"></div>
        <div data-item="後" data-value="8"></div>
      </div>`);
    expect(text(figure, '.ig-compare-delta')).toBe('+8');
  });

  it('advises when handed more than two values', () => {
    render('<div data-infograph="compare" data-items="A: 1, B: 2, C: 3"></div>');
    expect(warnings().join()).toMatch(/exactly two items/);
  });
});

describe('venn', () => {
  const overlap =
    '<div data-infograph="venn" data-a="内製開発" data-b="グローバル化" data-ab="文化統合"></div>';

  it('clips the intersection instead of floating a third circle', () => {
    const figure = render(overlap);
    const lens = figure.querySelector('.ig-venn-circle-ab');
    expect(lens?.getAttribute('clip-path')).toMatch(/^url\(#ig-venn-clip-\d+\)$/);
  });

  it('gives each figure its own clip id', () => {
    const a = render(overlap).querySelector('.ig-venn-circle-ab')?.getAttribute('clip-path');
    const b = render(overlap).querySelector('.ig-venn-circle-ab')?.getAttribute('clip-path');
    expect(a).not.toBe(b);
  });

  it('moves the circles apart as the overlap shrinks', () => {
    const cx = (html) =>
      Number(render(html).querySelector('.ig-venn-circle-a')?.getAttribute('cx'));
    const wide = cx('<div data-infograph="venn" data-a="A" data-b="B" data-overlap="0.8"></div>');
    const narrow = cx('<div data-infograph="venn" data-a="A" data-b="B" data-overlap="0.1"></div>');
    expect(narrow).toBeLessThan(wide);
  });

  it('anchors each label at its own circle', () => {
    const figure = render(overlap);
    const x = (sel) =>
      /** @type {HTMLElement} */ (figure.querySelector(sel)).style.getPropertyValue('--ig-venn-x');
    expect(parseFloat(x('.ig-venn-label-a'))).toBeLessThan(50);
    expect(parseFloat(x('.ig-venn-label-b'))).toBeGreaterThan(50);
    expect(parseFloat(x('.ig-venn-label-ab'))).toBeCloseTo(50, 5);
  });

  it('hides the drawing but keeps the labels readable', () => {
    const figure = render(overlap);
    expect(figure.querySelector('.ig-venn-svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(text(figure, '.ig-venn-label-ab')).toBe('文化統合');
  });

  it('declines a third set and explains why', () => {
    render('<div data-infograph="venn" data-a="A" data-b="B" data-c="C"></div>');
    expect(warnings().join()).toMatch(/data-c was ignored/);
  });
});

/*
 * Pictogram marks.
 *
 * The claim these tests defend is that a silhouette changes what a mark looks
 * like and nothing else — same cell count, same proportions, same emphasis
 * logic. The geometric half of that (cells still square, bars still on one
 * baseline) can only be checked in a browser and lives in
 * test/visual/principles.spec.js; what happy-dom can check is that the counts
 * are right, which for ISOTYPE is the whole ballgame.
 */
describe('symbols', () => {
  it('resolves a built-in name', () => {
    expect(resolveSymbol('person', null)?.path).toBe(SYMBOLS.person.path);
  });

  it('keeps blocks when nothing was asked for', () => {
    expect(resolveSymbol(null, null)).toBeNull();
  });

  it('lets a custom path override a deck-wide name', () => {
    // The deck sets `person`; this one figure needs its own glyph.
    expect(resolveSymbol('person', 'M0 0h24v24H0z')?.path).toBe('M0 0h24v24H0z');
  });

  it('falls back to blocks on an unknown name instead of throwing', () => {
    expect(resolveSymbol('unicorn', null)).toBeNull();
  });

  it('names the built-ins when it rejects one, so the fix is in the message', () => {
    render('<div data-infograph="waffle" data-value="40%" data-ig-symbol="unicorn"></div>');
    expect(warnings().join()).toMatch(/unknown symbol "unicorn"/);
    expect(warnings().join()).toMatch(/person/);
  });

  it('escapes the outline so it cannot break out of the CSS url()', () => {
    // encodeURIComponent has to eat the quote, or an author's path could
    // terminate the property early.
    const url = symbolUrl({ path: 'M0 0h1v1H0z"/></svg><script>x', viewBox: '0 0 24 24' });

    const payload = /^url\("data:image\/svg\+xml,(.*)"\)$/.exec(url)?.[1];
    expect(payload, 'should be a quoted data URI').toBeDefined();
    // Nothing inside the payload can close the quote or open a tag.
    expect(payload).not.toContain('"');
    expect(payload).not.toContain('<');
    expect(payload).not.toContain('>');
  });

  it('draws every built-in on a square viewBox', () => {
    // Load-bearing: a tall glyph would stop the waffle's cells being square,
    // and the grid stops being countable in rows.
    for (const [name, symbol] of Object.entries(SYMBOLS)) {
      expect(symbol.viewBox, `${name} viewBox`).toBe('0 0 24 24');
    }
  });
});

describe('waffle with symbols', () => {
  const html = (extra = '') =>
    `<div data-infograph="waffle" data-value="43.8%" data-ig-symbol="person" ${extra}></div>`;

  it('still draws a full hundred cells, still 44 filled', () => {
    const figure = render(html());
    expect(all(figure, '.ig-waffle-cell')).toHaveLength(WAFFLE.total);
    expect(all(figure, '.ig-waffle-cell-on')).toHaveLength(44);
  });

  it('sets the outline once on the figure, not on every cell', () => {
    const figure = render(html());
    const waffle = /** @type {HTMLElement} */ (figure.querySelector('.ig-waffle'));
    expect(waffle.style.getPropertyValue('--ig-symbol')).toContain('data:image/svg+xml');
    expect(
      /** @type {HTMLElement} */ (figure.querySelector('.ig-waffle-cell')).style.getPropertyValue(
        '--ig-symbol',
      ),
    ).toBe('');
  });

  it('marks the figure so the stylesheet can drop the cell hairline', () => {
    expect(render(html()).querySelector('.ig-waffle-symbol')).not.toBeNull();
  });

  it('leaves the hidden table alone — the numbers did not change', () => {
    const figure = render(html());
    expect(text(figure, 'table td')).toBe('43.8%');
  });

  it('takes a custom outline', () => {
    const figure = render(html('data-ig-symbol-path="M0 0h24v24H0z"'));
    const waffle = /** @type {HTMLElement} */ (figure.querySelector('.ig-waffle'));
    expect(decodeURIComponent(waffle.style.getPropertyValue('--ig-symbol'))).toContain(
      'M0 0h24v24H0z',
    );
  });
});

describe('bar with symbols', () => {
  it('draws one symbol per unit, so the count is the value', () => {
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="10"' +
        ' data-items="Remote: 30, Office: 50"></div>',
    );
    const [first, second] = all(figure, '.ig-bar-fill');
    expect(all(first, '.ig-bar-glyph')).toHaveLength(3);
    expect(all(second, '.ig-bar-glyph')).toHaveLength(5);
  });

  it('clips a partial symbol for the remainder rather than shrinking one', () => {
    // 34 at 10 per symbol is three whole and 0.4 of a fourth. A smaller glyph
    // would read as "a smaller thing", not "less of them".
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="10"' +
        ' data-items="Remote: 34"></div>',
    );
    const partial = /** @type {HTMLElement} */ (figure.querySelector('.ig-bar-glyph-partial'));
    expect(partial).not.toBeNull();
    expect(Number(partial.style.getPropertyValue('--ig-symbol-fraction'))).toBeCloseTo(0.4, 5);
    // The glyph inside is a whole one; only its container is short.
    expect(all(partial, '.ig-bar-glyph')).toHaveLength(1);
  });

  it('emits no partial when the value divides exactly', () => {
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="10"' +
        ' data-items="Remote: 30"></div>',
    );
    expect(figure.querySelector('.ig-bar-glyph-partial')).toBeNull();
  });

  it('states what one symbol is worth', () => {
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="10"' +
        ' data-items="Remote: 30"></div>',
    );
    expect(text(figure, '.ig-bar-unit')).toContain('= 10');
  });

  it('borrows the author’s own units for the key', () => {
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="10"' +
        ' data-items="Remote: 30 days"></div>',
    );
    expect(text(figure, '.ig-bar-unit')).toContain('= 10 days');
  });

  it('picks a round unit when the author does not, and prints it', () => {
    // 120 / 12 ≈ 10, and 10 is in the 1/2/2.5/5 family.
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-items="A: 120, B: 60"></div>',
    );
    expect(text(figure, '.ig-bar-unit')).toContain('= 10');
    expect(all(figure, '.ig-bar-fill')[0].querySelectorAll('.ig-bar-glyph')).toHaveLength(12);
  });

  it('advises when the longest bar has more symbols than anyone will count', () => {
    render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="1"' +
        ' data-items="A: 90"></div>',
    );
    expect(warnings().join()).toMatch(/nobody counts them/);
  });

  it('keeps the emphasis logic untouched', () => {
    const figure = render(
      '<div data-infograph="bar" data-ig-symbol="person" data-ig-symbol-unit="10"' +
        ' data-emphasis="2" data-items="Remote: 30, Office: 50"></div>',
    );
    expect(
      all(figure, '.ig-bar-fill').map((el) =>
        /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-bar-fill'),
      ),
    ).toEqual(['var(--ig-muted)', 'var(--ig-mark-1)']);
  });

  it('is still a plain bar when no symbol is asked for', () => {
    const figure = render('<div data-infograph="bar" data-items="Remote: 34, Office: 52"></div>');
    expect(figure.querySelector('.ig-bar-glyph')).toBeNull();
    expect(figure.querySelector('.ig-bar-unit')).toBeNull();
  });
});

describe('registry', () => {
  it('ships the documented forms', () => {
    expect(formNames().sort()).toEqual(['bar', 'compare', 'flow', 'stat', 'venn', 'waffle']);
  });

  it('accepts a form of your own and gives it the same pipeline', () => {
    registerForm('custom-test', ({ host, config }) => {
      const node = document.createElement('div');
      node.className = 'ig-figure custom-out';
      node.dataset.density = config.density;
      node.textContent = /** @type {HTMLElement} */ (host).dataset.value ?? '';
      return node;
    });

    const figure = render(
      '<div data-infograph="custom-test" data-value="hi" data-ig-density="compact"></div>',
    );
    expect(figure.textContent).toBe('hi');
    expect(figure.dataset.density).toBe('compact');
  });
});
