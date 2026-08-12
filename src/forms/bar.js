/**
 * bar — magnitude across categories, encoded as length on a common baseline.
 *
 *   <div data-infograph="bar" data-emphasis="2">
 *     <div data-item="在宅" data-value="34"></div>
 *     <div data-item="出社" data-value="52"></div>
 *   </div>
 *
 *   <div data-infograph="bar" data-items="在宅: 34, 出社: 52"></div>
 *
 * Horizontal, not vertical. Category labels are words, and words are wide:
 * horizontal bars give them a whole line each, left-aligned, in reading order,
 * with no rotation and no truncation. Vertical bars are for when the category
 * axis is itself ordered (time), which is not what this form is for.
 *
 * Labels sit at the start of each row and values at the end of each bar — both
 * inside the figure, never in a legend. The reader never has to look away from
 * a mark to find out what it is.
 *
 * The baseline is always zero. Truncating a bar axis to "show the difference
 * better" makes length stop meaning magnitude, which is the one thing the form
 * is for; if the interesting variation is small relative to the total, that is
 * information, not a formatting problem.
 */

import { el, cls } from '../dom.js';
import { figure, hideFromAt, dataTable } from '../a11y.js';
import { readItems, applyEmphasis } from '../parse.js';
import { advise } from '../warn.js';

/** @type {import('./index.js').Form} */
export default function bar({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const items = applyEmphasis(readItems(host, 'item'), data.emphasis, host);

  if (!items.length) {
    advise('bar has no items', {
      element: host,
      hint: 'Add <div data-item="ラベル" data-value="34"></div> children, or data-items="在宅: 34, 出社: 52".',
    });
  }

  const values = items.map((item) => (item.number.valid ? item.number.value : 0));
  // Zero baseline, and the scale is set by the largest bar rather than a round
  // number: nothing here is read off an axis, so a "nice" maximum would only
  // shorten every bar for no gain in accuracy.
  const max = Math.max(0, ...values.map(Math.abs)) || 1;
  const anyEmphasis = items.some((item) => item.emphasis);

  const rows = items.map((item, i) => {
    const magnitude = Math.abs(item.number.valid ? item.number.value : 0);
    const track = el(
      'div',
      { class: cls('bar-track') },
      hideFromAt(
        el('div', {
          class: cls('bar-fill'),
          style: {
            '--ig-bar-length': `${(magnitude / max) * 100}%`,
            '--ig-i': i,
            // With no emphasis every bar takes the primary mark colour: the
            // categories are the subject and share one identity. With emphasis
            // one bar keeps it and the rest drop to gray, so the highlight is
            // carried by contrast rather than by a colour the reader must learn.
            '--ig-bar-fill': anyEmphasis && !item.emphasis ? 'var(--ig-muted)' : 'var(--ig-mark-1)',
          },
        }),
      ),
    );

    return el(
      'div',
      {
        class: [cls('bar-row'), item.emphasis ? cls('bar-row', 'on') : ''],
        attrs: { 'data-id': data.id ? `ig-${data.id}-${i}` : null },
      },
      el('span', { class: cls('bar-name'), text: item.label }),
      track,
      el('span', { class: cls('bar-value'), text: item.number.valid ? item.number.text : '—' }),
    );
  });

  const visual = el('div', { class: cls('bar') }, ...rows);

  return figure({
    form: 'bar',
    label: data.label ?? `${items.length} 項目の比較`,
    visual,
    // The labels and values are already in the accessible tree in row order, so
    // the table exists to state the *relationship* — which column is which.
    table: dataTable({
      caption: data.label ?? '比較',
      columns: ['項目', '値'],
      rows: items.map((item) => [item.label, item.number.valid ? item.number.text : '—']),
    }),
    caption: data.caption,
  });
}
