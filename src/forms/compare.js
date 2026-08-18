/**
 * compare — two values, and the size of the gap between them.
 *
 *   <div data-infograph="compare" data-label="Average lead time">
 *     <div data-item="Before" data-value="18 days"></div>
 *     <div data-item="After" data-value="6 days" data-emphasis></div>
 *   </div>
 *
 * A two-bar chart spends an axis, a baseline and a scale on a comparison the
 * reader could make from two numbers side by side. What they cannot do from two
 * numbers alone is the arithmetic — so this form does it for them and states
 * the delta as its own labelled quantity.
 *
 * That delta is the sentence the slide is actually making. Leaving it implicit
 * asks every person in the room to compute it silently, at different speeds,
 * while the speaker keeps talking; some of them will still be doing it during
 * the next slide.
 *
 * The "after" side takes the emphasis colour by default because that is nearly
 * always the claim. `data-emphasis="1"` moves it when it is not.
 */

import { el, cls } from '../dom.js';
import { figure, hideFromAt, dataTable } from '../a11y.js';
import { readItems, applyEmphasis, formatNumber } from '../parse.js';
import { advise } from '../warn.js';

/** @type {import('./index.js').Form} */
export default function compare({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const items = applyEmphasis(readItems(host, 'item'), data.emphasis ?? '2');

  if (items.length !== 2) {
    advise(`compare takes exactly two items, got ${items.length}`, {
      element: host,
      hint: 'For three or more, data-infograph="bar" ranks them on a common baseline.',
    });
  }

  const [before, after] = items;
  const sides = items.slice(0, 2).map((item, i) =>
    el(
      'div',
      {
        class: [cls('compare-side'), item.emphasis ? cls('compare-side', 'on') : ''],
        style: { '--ig-i': i },
        attrs: { 'data-id': data.id ? `ig-${data.id}-${i}` : null },
      },
      el('div', { class: cls('compare-value'), text: item.number.valid ? item.number.text : '—' }),
      el('div', { class: cls('compare-name'), text: item.label }),
    ),
  );

  const visual = el(
    'div',
    { class: cls('compare') },
    data.label ? el('div', { class: cls('compare-title'), text: data.label }) : null,
    el(
      'div',
      { class: cls('compare-row') },
      sides[0] ?? null,
      hideFromAt(el('div', { class: cls('compare-arrow'), text: '→' })),
      sides[1] ?? null,
    ),
    delta(before, after),
  );

  return figure({
    form: 'compare',
    label: data.label ?? items.map((i) => `${i.label} ${i.number.text}`).join(' → '),
    visual,
    table: dataTable({
      caption: data.label ?? 'Comparison',
      columns: ['Point in time', 'Value'],
      rows: items.map((item) => [item.label, item.number.valid ? item.number.text : '—']),
    }),
    caption: data.caption,
  });
}

/**
 * The change between the two sides, stated in whichever way is honest.
 *
 * Absolute change always; relative change only when the baseline is non-zero
 * and positive. A percentage change off a zero or negative base is arithmetic
 * that produces a number without producing a meaning, and it turns up on slides
 * more often than it should.
 *
 * @param {import('../parse.js').Item|undefined} before
 * @param {import('../parse.js').Item|undefined} after
 */
function delta(before, after) {
  if (!before?.number.valid || !after?.number.valid) return null;

  const change = after.number.value - before.number.value;
  const spec = { ...after.number, plus: true, prefix: '', suffix: after.number.suffix };
  const absolute = formatNumber(change, spec);

  const parts = [absolute];
  if (before.number.value > 0) {
    const pct = (change / before.number.value) * 100;
    parts.push(`${pct >= 0 ? '+' : ''}${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`);
  }

  return el(
    'div',
    { class: [cls('compare-delta'), change < 0 ? cls('compare-delta', 'down') : ''] },
    el('span', { class: cls('compare-delta-value'), text: parts.join('  /  ') }),
  );
}
