import { describe, it, expect } from 'vitest';
import { render, text, all, warnings } from './helpers/mount.js';
import { formNames, registerForm } from '../src/forms/index.js';
import { WAFFLE, CYCLE } from '../src/design/tokens.js';
import { SYMBOLS, resolveSymbol, symbolUrl } from '../src/design/symbols.js';
import { iconFor } from '../src/icon.js';

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

  it('advises past eight steps', () => {
    const stepEls = Array.from(
      { length: 9 },
      (_, i) => `<div data-step="Step ${i}">Body ${i}</div>`,
    ).join('');
    render(`<div data-infograph="flow">${stepEls}</div>`);
    expect(warnings().join()).toMatch(/more than 8/);
  });

  it('wraps each connector together with the step it introduces, so a line-wrap can never separate them', () => {
    // flex-wrap only ever wraps at item boundaries — an arrow and step left as
    // separate top-level children could land on opposite sides of a wrap. See
    // .ig-flow-unit in styles/infograph.css for the geometry this guards.
    const figure = render(steps);
    const arrows = all(figure, '.ig-flow-arrow');
    expect(arrows).toHaveLength(2);
    for (const arrow of arrows) {
      const parent = arrow.parentElement;
      expect(parent?.classList.contains('ig-flow-unit')).toBe(true);
      expect(parent?.querySelector('.ig-flow-step')).not.toBeNull();
    }

    // The first step has no connector before it, so nothing needs wrapping
    // with it — it stays a bare child of .ig-flow, unlike the rest.
    const [firstStep] = all(figure, '.ig-flow-step');
    expect(firstStep.parentElement?.classList.contains('ig-flow-unit')).toBe(false);
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

describe('pyramid', () => {
  const maslow = `<div data-infograph="pyramid"><ul>
    <li>Self-actualization</li>
    <li>Esteem</li>
    <li>Love and belonging</li>
    <li>Safety needs</li>
    <li>Physiological needs</li>
  </ul></div>`;

  it('reads levels apex-first, in document order', () => {
    const figure = render(maslow);
    expect(all(figure, '.ig-pyramid-label-text').map((el) => el.textContent)).toEqual([
      'Self-actualization',
      'Esteem',
      'Love and belonging',
      'Safety needs',
      'Physiological needs',
    ]);
  });

  it('clips the apex to a point and the base to the full width', () => {
    const figure = render(maslow);
    const clip = (i) =>
      /** @type {HTMLElement} */ (all(figure, '.ig-pyramid-band')[i]).style.getPropertyValue(
        '--ig-pyramid-clip',
      );

    // The apex (tier 0) closes to a point: its top-left and top-right corners
    // are the same x. The base (last tier) spans the full 0%–100% at the
    // bottom edge.
    expect(clip(0)).toMatch(/polygon\(50% 0%, 50% 0%,/);
    expect(clip(4)).toMatch(/, 100% 100%, 0% 100%\)$/);
  });

  it('narrows monotonically toward the apex', () => {
    // Read the top-left x out of each polygon() and confirm it only grows as
    // tiers go from apex to base — the geometric claim the whole form rests on.
    const figure = render(maslow);
    const topLeftXs = all(figure, '.ig-pyramid-band').map((el) => {
      const clip = /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-pyramid-clip');
      return Number(/polygon\(([\d.]+)%/.exec(clip)?.[1]);
    });
    for (let i = 1; i < topLeftXs.length; i++) {
      expect(topLeftXs[i], `tier ${i} vs tier ${i - 1}`).toBeLessThanOrEqual(topLeftXs[i - 1]);
    }
  });

  it('gives every tier the same fill when nothing is emphasised', () => {
    const figure = render(maslow);
    const fills = all(figure, '.ig-pyramid-band').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-pyramid-fill'),
    );
    expect(new Set(fills).size).toBe(1);
  });

  it('grays every tier but the emphasised one', () => {
    const figure = render(
      maslow.replace('data-infograph="pyramid"', 'data-infograph="pyramid" data-emphasis="2"'),
    );
    const fills = all(figure, '.ig-pyramid-band').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-pyramid-fill'),
    );
    expect(fills[1]).toBe('var(--ig-mark-1)');
    expect(fills.filter((f, i) => i !== 1).every((f) => f === 'var(--ig-muted)')).toBe(true);
  });

  it('reads data-level children the same way <li> works', () => {
    const figure = render(`<div data-infograph="pyramid">
      <div data-level="Top"></div>
      <div data-level="Bottom"></div>
    </div>`);
    expect(all(figure, '.ig-pyramid-label-text').map((el) => el.textContent)).toEqual([
      'Top',
      'Bottom',
    ]);
  });

  it('reads the data-items shorthand too', () => {
    const figure = render('<div data-infograph="pyramid" data-items="Top, Bottom"></div>');
    expect(all(figure, '.ig-pyramid-band')).toHaveLength(2);
  });

  it('prints a value when one is given, but not in the fill', () => {
    const figure = render(`<div data-infograph="pyramid"><ul>
      <li>Enterprise: 400</li><li>Mid-market: 1200</li>
    </ul></div>`);
    expect(text(figure, '.ig-pyramid-label-value')).toBe('400');
  });

  it('advises that width is not encoding the value it prints', () => {
    render(`<div data-infograph="pyramid"><ul>
      <li>Enterprise: 400</li><li>Mid-market: 1200</li>
    </ul></div>`);
    expect(warnings().join()).toMatch(/not magnitude/);
  });

  it('advises below two levels', () => {
    render('<div data-infograph="pyramid"><ul><li>Only one</li></ul></div>');
    expect(warnings().join()).toMatch(/at least two levels/);
  });

  it('advises past seven levels', () => {
    const items = Array.from({ length: 8 }, (_, i) => `<li>Level ${i}</li>`).join('');
    render(`<div data-infograph="pyramid"><ul>${items}</ul></div>`);
    expect(warnings().join()).toMatch(/more than 7/);
  });

  it('does not trip bar’s working-memory ceiling — a hierarchy is read one tier at a time', () => {
    // Five tiers is within pyramid's own MAX_TIERS but past bar's maxSeries: 4.
    // checkEncoding() must not apply bar's simultaneous-decode ceiling here —
    // this is the exact shape of the bundled Maslow example, which used to
    // trip this warning on every load.
    render(maslow);
    expect(warnings().join()).not.toMatch(/hard to hold in mind/);
  });

  it('hides the shape from assistive tech and keeps the labels', () => {
    const figure = render(maslow);
    expect(
      figure.querySelector('.ig-pyramid-band')?.closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(figure.querySelector('.ig-pyramid-label')?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('carries no hidden table — the tiers are already text, in rank order', () => {
    expect(render(maslow).querySelector('table')).toBeNull();
  });

  it('names the figure top-down', () => {
    const figure = render(maslow);
    expect(figure.getAttribute('aria-label')).toBe(
      'Self-actualization → Esteem → Love and belonging → Safety needs → Physiological needs',
    );
  });
});

describe('cycle', () => {
  const pdca = `<div data-infograph="cycle"><ul>
    <li>Plan</li>
    <li>Do</li>
    <li>Check</li>
    <li>Act</li>
  </ul></div>`;

  it('reads stages in order, one node and one arrow per stage', () => {
    const figure = render(pdca);
    expect(all(figure, '.ig-cycle-node')).toHaveLength(4);
    // A closed loop draws n arrows, not n - 1 — the last one closes back to
    // the first, unlike flow's straight sequence.
    expect(all(figure, '.ig-cycle-arrow')).toHaveLength(4);
  });

  it('places the first stage at the top of the ring', () => {
    const figure = render(pdca);
    const [first] = all(figure, '.ig-cycle-node');
    const cx = Number(first.getAttribute('cx'));
    const cy = Number(first.getAttribute('cy'));
    // Top of a centred ring: same x as the centre, smaller y (SVG y grows
    // downward).
    expect(cx).toBeCloseTo(CYCLE.centerX, 0);
    expect(cy).toBeLessThan(CYCLE.centerY);
  });

  it('places every node the same distance from the centre', () => {
    const figure = render(pdca);
    const distances = all(figure, '.ig-cycle-node').map((el) => {
      const cx = Number(el.getAttribute('cx'));
      const cy = Number(el.getAttribute('cy'));
      return Math.hypot(cx - CYCLE.centerX, cy - CYCLE.centerY);
    });
    for (const d of distances) expect(d).toBeCloseTo(distances[0], 5);
  });

  it('gives every node the same fill when nothing is emphasised', () => {
    const figure = render(pdca);
    const fills = all(figure, '.ig-cycle-node').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-cycle-fill'),
    );
    expect(new Set(fills).size).toBe(1);
  });

  it('grays every node but the emphasised one', () => {
    const figure = render(
      pdca.replace('data-infograph="cycle"', 'data-infograph="cycle" data-emphasis="2"'),
    );
    const fills = all(figure, '.ig-cycle-node').map((el) =>
      /** @type {HTMLElement} */ (el).style.getPropertyValue('--ig-cycle-fill'),
    );
    expect(fills[1]).toBe('var(--ig-mark-1)');
    expect(fills.filter((f, i) => i !== 1).every((f) => f === 'var(--ig-muted)')).toBe(true);
  });

  it('bolds the emphasised label too', () => {
    const figure = render(
      pdca.replace('data-infograph="cycle"', 'data-infograph="cycle" data-emphasis="2"'),
    );
    expect(all(figure, '.ig-cycle-label')[1].classList.contains('ig-cycle-label-on')).toBe(true);
  });

  it('reads data-stage children the same way <li> works', () => {
    const figure = render(`<div data-infograph="cycle">
      <div data-stage="Push"></div>
      <div data-stage="Pull"></div>
    </div>`);
    expect(all(figure, '.ig-cycle-node')).toHaveLength(2);
  });

  it('reads the data-items shorthand too', () => {
    const figure = render('<div data-infograph="cycle" data-items="A, B, C"></div>');
    expect(all(figure, '.ig-cycle-node')).toHaveLength(3);
  });

  it('advises below two stages', () => {
    render('<div data-infograph="cycle"><ul><li>Only one</li></ul></div>');
    expect(warnings().join()).toMatch(/at least two stages/);
  });

  it('advises past eight stages', () => {
    const items = Array.from({ length: 9 }, (_, i) => `<li>Stage ${i}</li>`).join('');
    render(`<div data-infograph="cycle"><ul>${items}</ul></div>`);
    expect(warnings().join()).toMatch(/more than 8/);
  });

  it('does not trip bar’s working-memory ceiling — a cycle is read one stage at a time', () => {
    // Six stages is within cycle's own MAX_STAGES but past bar's maxSeries: 4.
    const items = Array.from({ length: 6 }, (_, i) => `<li>Stage ${i}</li>`).join('');
    render(`<div data-infograph="cycle"><ul>${items}</ul></div>`);
    expect(warnings().join()).not.toMatch(/hard to hold in mind/);
  });

  it('hides the ring from assistive tech and keeps the labels', () => {
    const figure = render(pdca);
    expect(figure.querySelector('.ig-cycle-svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(figure.querySelector('.ig-cycle-label')?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('carries no hidden table — the labels are already text, in order', () => {
    expect(render(pdca).querySelector('table')).toBeNull();
  });

  it('states the closure explicitly in the accessible name', () => {
    // Plain reading order doesn't convey that the last stage leads back to
    // the first; the derived name says so directly.
    expect(render(pdca).getAttribute('aria-label')).toBe('Plan → Do → Check → Act → Plan');
  });

  it('gives every figure its own marker id, so two on one page do not collide', () => {
    const a = render(pdca).querySelector('marker')?.id;
    const b = render(pdca).querySelector('marker')?.id;
    expect(a).not.toBe(b);
  });
});

describe('quadrant', () => {
  const cells = `
    <div data-label="Do First"><ul><li>Fix production bug</li><li>Client deadline today</li></ul></div>
    <div data-label="Schedule"><ul><li>Plan Q3 roadmap</li></ul></div>
    <div data-label="Delegate"><ul><li>Answer routine emails</li></ul></div>
    <div data-label="Eliminate"><ul><li>Check social media</li></ul></div>`;

  const eisenhower = `<div data-infograph="quadrant"
    data-x-label="Urgency" data-columns="Urgent, Not urgent"
    data-y-label="Importance" data-rows="Important, Not important">${cells}</div>`;

  /** The same figure as it was authored before axis ends could be named. */
  const unheaded = `<div data-infograph="quadrant" data-x-label="Urgent" data-y-label="Important">${cells}</div>`;

  it('reads four cells in document order, top-left through bottom-right', () => {
    const figure = render(eisenhower);
    expect(all(figure, '.ig-quadrant-title').map((el) => el.textContent)).toEqual([
      'Do First',
      'Schedule',
      'Delegate',
      'Eliminate',
    ]);
  });

  it('reads each cell’s own item list', () => {
    const figure = render(eisenhower);
    const [first] = all(figure, '.ig-quadrant-cell');
    expect(all(first, '.ig-quadrant-item').map((el) => el.textContent)).toEqual([
      'Fix production bug',
      'Client deadline today',
    ]);
  });

  it('reads data-item children the same way <li> works', () => {
    const figure = render(`<div data-infograph="quadrant">
      <div data-label="A"><div data-item="x"></div></div>
      <div data-label="B"><div data-item="y"></div></div>
      <div data-label="C"><div data-item="z"></div></div>
      <div data-label="D"><div data-item="w"></div></div>
    </div>`);
    expect(all(figure, '.ig-quadrant-item').map((el) => el.textContent)).toEqual([
      'x',
      'y',
      'z',
      'w',
    ]);
  });

  it('reads the data-items shorthand too', () => {
    const figure = render(`<div data-infograph="quadrant">
      <div data-label="A" data-items="x, y"></div>
      <div data-label="B"></div>
      <div data-label="C"></div>
      <div data-label="D"></div>
    </div>`);
    expect(all(figure, '.ig-quadrant-item').map((el) => el.textContent)).toEqual(['x', 'y']);
  });

  it('leaves an empty cell empty rather than inventing a placeholder', () => {
    const figure = render(`<div data-infograph="quadrant">
      <div data-label="A"></div>
      <div data-label="B"></div>
      <div data-label="C"></div>
      <div data-label="D"></div>
    </div>`);
    expect(figure.querySelector('.ig-quadrant-items')).toBeNull();
  });

  it('highlights one cell with data-emphasis', () => {
    const figure = render(
      eisenhower.replace(
        'data-infograph="quadrant"',
        'data-infograph="quadrant" data-emphasis="2"',
      ),
    );
    expect(
      all(figure, '.ig-quadrant-cell').map((el) => el.classList.contains('ig-quadrant-cell-on')),
    ).toEqual([false, true, false, false]);
  });

  it('advises when there are not exactly four cells', () => {
    render(`<div data-infograph="quadrant">
      <div data-label="A"></div>
      <div data-label="B"></div>
      <div data-label="C"></div>
    </div>`);
    expect(warnings().join()).toMatch(/exactly four cells/);
  });

  it('advises when a cell has no title', () => {
    render(`<div data-infograph="quadrant">
      <div><ul><li>x</li></ul></div>
      <div data-label="B"></div>
      <div data-label="C"></div>
      <div data-label="D"></div>
    </div>`);
    expect(warnings().join()).toMatch(/no data-label/);
  });

  it('advises when one cell has too many items', () => {
    const items = Array.from({ length: 7 }, (_, i) => `<li>Task ${i}</li>`).join('');
    render(`<div data-infograph="quadrant">
      <div data-label="Busy"><ul>${items}</ul></div>
      <div data-label="B"></div>
      <div data-label="C"></div>
      <div data-label="D"></div>
    </div>`);
    expect(warnings().join()).toMatch(/stopped being a priority list/);
  });

  it('carries no hidden table — every cell is already visible text', () => {
    expect(render(eisenhower).querySelector('table')).toBeNull();
  });

  it('states both axes and all four titles in the accessible name', () => {
    // The parenthesised ends are the point: an axis name alone says what is
    // measured, never which way it grows, and position is exactly what a
    // screen-reader user cannot see.
    expect(render(eisenhower).getAttribute('aria-label')).toBe(
      'Urgency (Urgent / Not urgent) vs. Importance (Important / Not important): ' +
        'Do First, Schedule, Delegate, Eliminate',
    );
  });

  describe('axis ends', () => {
    it('names the columns left to right and the rows top to bottom', () => {
      const figure = render(eisenhower);
      expect(all(figure, '.ig-quadrant-col-header').map((el) => el.textContent)).toEqual([
        'Urgent',
        'Not urgent',
      ]);
      expect(all(figure, '.ig-quadrant-row-header').map((el) => el.textContent)).toEqual([
        'Important',
        'Not important',
      ]);
    });

    it('lays the grid out in reading order, headers included', () => {
      // Row-major DOM order is what lets the grid auto-place with no explicit
      // positioning, and it is also what a screen reader hears linearly: the
      // column names, then each row's name followed by its own two cells.
      const grid = render(eisenhower).querySelector('.ig-quadrant-grid');
      expect([...grid.children].map((c) => c.className)).toEqual([
        'ig-quadrant-corner',
        'ig-quadrant-col-header',
        'ig-quadrant-col-header',
        'ig-quadrant-row-header',
        'ig-quadrant-cell',
        'ig-quadrant-cell',
        'ig-quadrant-row-header',
        'ig-quadrant-cell',
        'ig-quadrant-cell',
      ]);
    });

    it('heads only the columns when only columns are named', () => {
      const grid = render(
        `<div data-infograph="quadrant" data-columns="Urgent, Not urgent">${cells}</div>`,
      ).querySelector('.ig-quadrant-grid');
      // No corner: with one axis headed the grid is 2 columns wide, and a
      // spacer would push everything one cell out of place.
      expect(grid.querySelector('.ig-quadrant-corner')).toBeNull();
      expect(grid.classList.contains('ig-quadrant-grid-col-headed')).toBe(true);
      expect(grid.classList.contains('ig-quadrant-grid-row-headed')).toBe(false);
    });

    it('heads only the rows when only rows are named', () => {
      const grid = render(
        `<div data-infograph="quadrant" data-rows="Important, Not important">${cells}</div>`,
      ).querySelector('.ig-quadrant-grid');
      expect(grid.querySelector('.ig-quadrant-corner')).toBeNull();
      expect(grid.classList.contains('ig-quadrant-grid-row-headed')).toBe(true);
      expect(grid.classList.contains('ig-quadrant-grid-col-headed')).toBe(false);
    });

    it('leaves a figure with no named ends exactly as it was', () => {
      // Axis ends are additive: a deck written before they existed keeps its
      // markup, its four bare cells, and its accessible name.
      const figure = render(unheaded);
      expect(all(figure, '.ig-quadrant-col-header')).toHaveLength(0);
      expect(all(figure, '.ig-quadrant-row-header')).toHaveLength(0);
      expect(figure.querySelector('.ig-quadrant-grid').children).toHaveLength(4);
      expect(figure.getAttribute('aria-label')).toBe(
        'Urgent vs. Important: Do First, Schedule, Delegate, Eliminate',
      );
    });

    it('names the ends without a dimension name too', () => {
      const figure = render(
        `<div data-infograph="quadrant" data-columns="Urgent, Not urgent">${cells}</div>`,
      );
      expect(figure.getAttribute('aria-label')).toBe(
        '(Urgent / Not urgent): Do First, Schedule, Delegate, Eliminate',
      );
    });

    it('keeps a colon inside an end label instead of splitting on it', () => {
      // parseItemList() would read "Q1: strong" as label "Q1" with a value —
      // these are plain strings, so they get their own splitter.
      const figure = render(
        `<div data-infograph="quadrant" data-columns="Q1: strong, Q4: weak">${cells}</div>`,
      );
      expect(all(figure, '.ig-quadrant-col-header').map((el) => el.textContent)).toEqual([
        'Q1: strong',
        'Q4: weak',
      ]);
    });
  });
});

/*
 * Per-element icons — flow, pyramid, cycle, quadrant.
 *
 * The rule under test is src/icon.js's: an icon names, it never measures. So
 * these tests check identity (the right glyph on the right element, in
 * whichever of the three notations authored it), not magnitude — there is no
 * magnitude here to check. The geometric claims (same size, no overlap with
 * the label it names) can only be checked in a browser and live in
 * test/visual/principles.spec.js.
 */
describe('icons', () => {
  describe('the three notations', () => {
    it('reads data-icon as a built-in name', () => {
      const figure = render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon="check"></div>
        <div data-step="Do" data-icon="gear"></div>
      </div>`);
      expect(all(figure, '.ig-flow-step .ig-icon')).toHaveLength(2);
    });

    it('reads data-icon-path as a custom silhouette', () => {
      const figure = render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon-path="M0 0h24v24H0z"></div>
        <div data-step="Do" data-icon-path="M0 0h24v24H0z"></div>
      </div>`);
      const icon = /** @type {HTMLElement} */ (figure.querySelector('.ig-icon'));
      expect(decodeURIComponent(icon.style.getPropertyValue('--ig-icon-image'))).toContain(
        'M0 0h24v24H0z',
      );
    });

    it('clones an inline <svg data-icon> child rather than moving it', () => {
      // Exercised directly against iconFor(): renderHost() empties a host's
      // children right after the form returns (src/render.js), so by the time
      // render() hands back a figure there is nothing left to query the
      // original against — the property under test has to be checked at the
      // point where the move-vs-clone choice is actually made.
      const source = document.createElement('div');
      source.innerHTML = '<svg data-icon viewBox="0 0 24 24"><circle r="10"/></svg>';
      const svg = source.querySelector('svg');

      const icon = iconFor(source);

      expect(icon?.querySelector('svg')).not.toBeNull();
      expect(icon?.querySelector('svg')).not.toBe(svg);
      // The author's element still has its own child — nothing was moved out.
      expect(source.contains(svg)).toBe(true);
    });

    it('prefers the inline svg over data-icon-path over data-icon', () => {
      const figure = render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon="check" data-icon-path="M0 0h1v1H0z">
          <svg data-icon viewBox="0 0 24 24"><circle r="10"/></svg>
        </div>
        <div data-step="Do"></div>
      </div>`);
      expect(figure.querySelector('.ig-flow-step .ig-icon-inline')).not.toBeNull();
    });

    it('falls back to no icon on an unknown name, and advises with the built-in list', () => {
      const figure = render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon="unicorn"></div>
        <div data-step="Do"></div>
      </div>`);
      expect(figure.querySelector('.ig-flow-step .ig-icon')).toBeNull();
      expect(warnings().join()).toMatch(/unknown symbol "unicorn"/);
    });
  });

  describe('placement across forms', () => {
    it('sits inside a flow step, above its label', () => {
      const figure = render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon="check"></div>
        <div data-step="Do"></div>
      </div>`);
      expect(figure.querySelector('.ig-flow-step .ig-icon')).not.toBeNull();
    });

    it('sits inside a pyramid tier label', () => {
      const figure = render(`<div data-infograph="pyramid"><ul>
        <li data-icon="star">Top</li>
        <li>Bottom</li>
      </ul></div>`);
      expect(figure.querySelector('.ig-pyramid-label .ig-icon')).not.toBeNull();
    });

    it('sits above a cycle stage label, splitting it into an icon and a text span', () => {
      const figure = render(`<div data-infograph="cycle"><ul>
        <li data-icon="check">Plan</li>
        <li>Do</li>
      </ul></div>`);
      const [first] = all(figure, '.ig-cycle-label');
      expect(first.classList.contains('ig-cycle-label-iconed')).toBe(true);
      expect(first.querySelector('.ig-icon')).not.toBeNull();
      expect(first.querySelector('.ig-cycle-label-text')?.textContent).toBe('Plan');
    });

    it('leaves a plain cycle stage as the single span it has always been', () => {
      const figure = render(`<div data-infograph="cycle"><ul>
        <li>Plan</li><li>Do</li>
      </ul></div>`);
      const [first] = all(figure, '.ig-cycle-label');
      expect(first.classList.contains('ig-cycle-label-iconed')).toBe(false);
      expect(first.querySelector('.ig-cycle-label-text')).toBeNull();
      expect(first.textContent).toBe('Plan');
    });

    it('wraps a quadrant cell title with its icon in a head row', () => {
      const figure = render(`<div data-infograph="quadrant">
        <div data-label="A" data-icon="check"></div>
        <div data-label="B"></div>
        <div data-label="C"></div>
        <div data-label="D"></div>
      </div>`);
      const head = figure.querySelector('.ig-quadrant-head');
      expect(head).not.toBeNull();
      expect(head.querySelector('.ig-icon')).not.toBeNull();
      expect(head.querySelector('.ig-quadrant-title')?.textContent).toBe('A');
    });

    it('leaves an icon-less quadrant cell as the plain title it has always been', () => {
      const figure = render(`<div data-infograph="quadrant">
        <div data-label="A"></div>
        <div data-label="B"></div>
        <div data-label="C"></div>
        <div data-label="D"></div>
      </div>`);
      expect(figure.querySelector('.ig-quadrant-head')).toBeNull();
      expect(figure.querySelector('.ig-quadrant-title')).not.toBeNull();
    });
  });

  describe('advisories', () => {
    it('warns when an icon has no visible label', () => {
      render(`<div data-infograph="flow">
        <div data-step="" data-icon="check"></div>
        <div data-step="Do" data-icon="check"></div>
      </div>`);
      expect(warnings().join()).toMatch(/a flow step has data-icon but no visible label/);
    });

    it('warns when only some elements in a figure carry an icon', () => {
      render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon="check"></div>
        <div data-step="Do"></div>
      </div>`);
      expect(warnings().join()).toMatch(/some flow steps have data-icon and some do not/);
    });

    it('stays quiet about coverage when every element carries an icon', () => {
      render(`<div data-infograph="flow">
        <div data-step="Plan" data-icon="check"></div>
        <div data-step="Do" data-icon="gear"></div>
      </div>`);
      expect(warnings().join()).not.toMatch(/some flow steps/);
    });

    it('stays quiet when no element carries an icon', () => {
      render(`<div data-infograph="flow">
        <div data-step="Plan"></div>
        <div data-step="Do"></div>
      </div>`);
      expect(warnings().join()).not.toMatch(/data-icon/);
    });

    it('checks coverage per figure, in each form’s own words', () => {
      render(`<div data-infograph="quadrant">
        <div data-label="A" data-icon="check"></div>
        <div data-label="B"></div>
        <div data-label="C"></div>
        <div data-label="D"></div>
      </div>`);
      expect(warnings().join()).toMatch(/some quadrant cells have data-icon and some do not/);
    });
  });

  it('leaves the accessible name unchanged — icons are aria-hidden and add no text', () => {
    const withoutIcons = render(`<div data-infograph="flow">
      <div data-step="課題">分断されたチーム</div>
      <div data-step="結果">+43.8%</div>
    </div>`);
    const withIcons = render(`<div data-infograph="flow">
      <div data-step="課題" data-icon="alert">分断されたチーム</div>
      <div data-step="結果" data-icon="check">+43.8%</div>
    </div>`);
    expect(withIcons.getAttribute('aria-label')).toBe(withoutIcons.getAttribute('aria-label'));
  });

  it('is aria-hidden, so it adds nothing a screen reader would read twice', () => {
    const figure = render(`<div data-infograph="flow">
      <div data-step="Plan" data-icon="check"></div>
      <div data-step="Do"></div>
    </div>`);
    expect(figure.querySelector('.ig-icon')?.closest('[aria-hidden="true"]')).not.toBeNull();
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
    expect(formNames().sort()).toEqual([
      'bar',
      'compare',
      'cycle',
      'flow',
      'pyramid',
      'quadrant',
      'stat',
      'venn',
      'waffle',
    ]);
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
