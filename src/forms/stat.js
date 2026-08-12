/**
 * stat — one number, said once.
 *
 *   <div data-infograph="stat" data-value="43.8%" data-label="回答者が同意"
 *        data-note="n=1,204 / 2026年調査"></div>
 *
 * The least chart-like form here, and often the right one. A single quantity
 * has no comparison to support, so a chart adds an axis, a scale and a mark
 * that all carry zero information — extraneous load in the precise sense. Set
 * the number large, put its meaning directly beneath it, and the reader is done
 * in one fixation.
 *
 * Three slots, in decreasing weight: value, label, note. That order is the
 * whole design — the eye lands on the number, then reads what it is, then finds
 * the provenance if it wants it.
 */

import { el, cls } from '../dom.js';
import { figure } from '../a11y.js';
import { parseNumber } from '../parse.js';
import { advise } from '../warn.js';

/** @type {import('./index.js').Form} */
export default function stat({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const number = parseNumber(data.value);
  const label = data.label ?? '';
  const note = data.note;

  if (!number.text) {
    advise('stat has no data-value', {
      element: host,
      hint: 'A stat is a number and its meaning: data-value="43.8%" data-label="回答者が同意".',
    });
  }

  if (!label) {
    advise('stat has a value but no data-label', {
      element: host,
      hint: 'A number with no stated referent is decoration. Say what it counts.',
    });
  }

  const value = el('div', {
    class: cls('stat-value'),
    attrs: {
      // Stable data-id so a deck can auto-animate the same statistic across two
      // slides (e.g. a value morphing after a reveal) without hand-labelling.
      'data-id': data.id ? `ig-${data.id}-value` : null,
    },
    text: number.text,
  });

  const visual = el(
    'div',
    { class: cls('stat') },
    value,
    label ? el('div', { class: cls('stat-label'), text: label }) : null,
    note ? el('div', { class: cls('stat-note'), text: note }) : null,
  );

  // No hidden table: the visible text already reads in a sensible order
  // ("43.8%, 回答者が同意"), and duplicating it would make a screen reader say
  // the number twice.
  return figure({
    form: 'stat',
    label: [number.text, label].filter(Boolean).join(' — '),
    visual,
    caption: data.caption,
  });
}
