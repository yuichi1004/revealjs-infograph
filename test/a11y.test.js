/**
 * The accessibility contract, stated once for every form.
 *
 * These are deliberately written as a loop over the registry rather than as
 * per-form assertions: a new form added without an accessible name or with an
 * unlabelled graphic should fail here on the day it is written, not whenever
 * someone remembers to add a test for it.
 */

import { describe, it, expect } from 'vitest';
import { render, all } from './helpers/mount.js';
import { formNames } from '../src/forms/index.js';

/** One representative, fully-specified example per built-in form. */
const SAMPLES = {
  stat: '<div data-infograph="stat" data-value="43.8%" data-label="回答者が同意" data-note="n=1,204"></div>',
  waffle: '<div data-infograph="waffle" data-value="43.8%" data-label="同意した回答者"></div>',
  bar: '<div data-infograph="bar" data-label="働き方" data-items="在宅: 34, 出社: 52"></div>',
  // flow, pyramid, cycle and quadrant carry a data-icon on every element —
  // icons are covered here too, on every element (not just some), so the
  // "give every one an icon, or none" advisory (src/icon.js) never fires on a
  // figure meant to model correct usage.
  flow: `<div data-infograph="flow">
           <div data-step="課題" data-icon="alert">分断されたチーム</div>
           <div data-step="結果" data-icon="check">+43.8%</div>
         </div>`,
  compare: `<div data-infograph="compare" data-label="平均リードタイム">
              <div data-item="導入前" data-value="18日"></div>
              <div data-item="導入後" data-value="6日"></div>
            </div>`,
  venn: '<div data-infograph="venn" data-a="内製開発" data-b="グローバル化" data-ab="文化統合"></div>',
  pyramid: `<div data-infograph="pyramid"><ul>
              <li data-icon="star">Self-actualization</li>
              <li data-icon="person">Esteem</li>
              <li data-icon="heart">Physiological needs</li>
            </ul></div>`,
  cycle: `<div data-infograph="cycle"><ul>
            <li data-icon="clock">Plan</li>
            <li data-icon="gear">Do</li>
            <li data-icon="check">Check</li>
            <li data-icon="flag">Act</li>
          </ul></div>`,
  quadrant: `<div data-infograph="quadrant"
               data-x-label="Urgency" data-columns="Urgent, Not urgent"
               data-y-label="Importance" data-rows="Important, Not important">
               <div data-label="Do First" data-icon="alert"><ul><li>Fix production bug</li></ul></div>
               <div data-label="Schedule" data-icon="clock"><ul><li>Plan Q3 roadmap</li></ul></div>
               <div data-label="Delegate" data-icon="flag"><ul><li>Answer routine emails</li></ul></div>
               <div data-label="Eliminate" data-icon="target"><ul><li>Check social media</li></ul></div>
             </div>`,
};

it('has a sample for every registered form', () => {
  // Guards the loops below from silently skipping a newly added form.
  expect(Object.keys(SAMPLES).sort()).toEqual(formNames().sort());
});

describe.each(Object.entries(SAMPLES))('%s', (form, html) => {
  it('is a figure element, so it can be skipped as one unit', () => {
    expect(render(html).tagName).toBe('FIGURE');
  });

  it('has a non-empty accessible name', () => {
    const label = render(html).getAttribute('aria-label');
    expect(label && label.trim().length).toBeGreaterThan(0);
  });

  it('tags itself with its form, for host-theme targeting', () => {
    expect(render(html).dataset.igForm).toBe(form);
  });

  it('leaves no graphic in the accessible tree without a text equivalent', () => {
    const figure = render(html);
    // SVG and mark containers are hidden; whatever remains visible to a screen
    // reader must be text, not geometry.
    for (const svg of all(figure, 'svg')) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('never leaves an aria-hidden="false" attribute lying around', () => {
    // A present-but-false aria-hidden is the classic way to hide nothing while
    // looking like you hid something; el() drops falsey attributes for this.
    expect(all(render(html), '[aria-hidden="false"]')).toHaveLength(0);
  });

  it('renders identically twice — no id or state leaks between figures', () => {
    const a = render(html);
    const b = render(html);
    // venn and cycle each mint a unique id per figure by design; everything
    // else must be byte-identical, or two copies of a figure on one deck
    // would differ.
    const strip = (/** @type {HTMLElement} */ node) =>
      node.innerHTML
        .replace(/ig-venn-clip-\d+/g, 'ig-venn-clip-N')
        .replace(/ig-cycle-arrow-\d+/g, 'ig-cycle-arrow-N');
    expect(strip(a)).toBe(strip(b));
  });
});

describe('tabular fallback', () => {
  it.each(['waffle', 'bar', 'compare'])('%s states its numbers in a table', (form) => {
    // These three encode magnitude in geometry that is hidden from assistive
    // tech, so the numbers have to be available some other way.
    const table = render(SAMPLES[form]).querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.querySelector('caption')?.textContent?.trim()).toBeTruthy();
    expect(table?.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0);
    expect(table?.querySelectorAll('th[scope="row"]').length).toBeGreaterThan(0);
  });

  it.each(['stat', 'flow', 'venn', 'pyramid', 'cycle', 'quadrant'])(
    '%s needs no table — its text already reads',
    (form) => {
      // Duplicating text that is already in the accessible tree makes a screen
      // reader say everything twice, which is its own accessibility problem.
      expect(render(SAMPLES[form]).querySelector('table')).toBeNull();
    },
  );

  it('hides the table visually without hiding it from assistive tech', () => {
    const wrapper = render(SAMPLES.bar).querySelector('.ig-sr-only');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('aria-hidden')).toBeNull();
    // Styled inline, so the fallback still works if the stylesheet is missing.
    expect(/** @type {HTMLElement} */ (wrapper).style.position).toBe('absolute');
  });
});

/*
 * Pictogram marks must not cost anything here. They are a paint-level change to
 * marks that were already hidden from assistive tech, so a screen reader should
 * not be able to tell symbol mode from block mode at all.
 */
describe('pictogram marks', () => {
  // Same data on both sides of each pair — only the symbol attributes differ,
  // so any difference in the accessible output is caused by the symbols.
  const PAIRS = {
    waffle: {
      plain: '<div data-infograph="waffle" data-value="43.8%" data-label="Agreed"></div>',
      symbol:
        '<div data-infograph="waffle" data-value="43.8%" data-label="Agreed" data-ig-symbol="person"></div>',
    },
    bar: {
      plain:
        '<div data-infograph="bar" data-label="Workplace" data-items="Remote: 34, Office: 52"></div>',
      symbol:
        '<div data-infograph="bar" data-label="Workplace" data-ig-symbol="person" data-ig-symbol-unit="10" data-items="Remote: 34, Office: 52"></div>',
    },
  };

  it.each(Object.keys(PAIRS))('%s keeps its accessible name and table', (form) => {
    const figure = render(PAIRS[form].symbol);
    expect(figure.getAttribute('aria-label')?.trim()).toBeTruthy();
    expect(figure.querySelector('table')).not.toBeNull();
  });

  it.each(Object.keys(PAIRS))('%s reads the same with symbols as without', (form) => {
    // The glyphs live inside the same aria-hidden subtree the blocks did, so a
    // screen reader should not be able to tell the two apart.
    const plain = render(PAIRS[form].plain).querySelector('.ig-sr-only')?.textContent;
    const symbol = render(PAIRS[form].symbol).querySelector('.ig-sr-only')?.textContent;
    expect(symbol).toBe(plain);
    expect(symbol?.trim()).toBeTruthy();
  });

  it.each(Object.keys(PAIRS))('%s keeps its accessible name unchanged', (form) => {
    expect(render(PAIRS[form].symbol).getAttribute('aria-label')).toBe(
      render(PAIRS[form].plain).getAttribute('aria-label'),
    );
  });

  it('states the unit in text, not only as a glyph', () => {
    // The count is the encoding, so "one symbol = 10" is not decoration — a
    // reader who cannot see the glyphs still needs the scale.
    const unit = render(PAIRS.bar.symbol).querySelector('.ig-bar-unit');
    expect(unit?.textContent).toContain('10');
    expect(unit?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it.each(Object.keys(PAIRS))('%s renders identically twice', (form) => {
    // The reason symbols are a data-URI mask and not a <symbol>/<use> pair: the
    // latter needs a unique id per figure, and this is what would catch it.
    const a = render(PAIRS[form].symbol);
    const b = render(PAIRS[form].symbol);
    expect(a.innerHTML).toBe(b.innerHTML);
  });
});
