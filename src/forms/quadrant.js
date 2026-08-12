/**
 * quadrant — four named buckets on two axes, Eisenhower-matrix style.
 *
 *   <div data-infograph="quadrant" data-x-label="Urgent" data-y-label="Important">
 *     <div data-label="Do First">
 *       <ul>
 *         <li>Fix production bug</li>
 *         <li>Client deadline today</li>
 *       </ul>
 *     </div>
 *     <div data-label="Schedule"><ul><li>Plan Q3 roadmap</li></ul></div>
 *     <div data-label="Delegate"><ul><li>Answer routine emails</li></ul></div>
 *     <div data-label="Eliminate"><ul><li>Check social media</li></ul></div>
 *   </div>
 *
 * Four children, in row-major reading order — top-left, top-right, bottom-left,
 * bottom-right — the same "just write it in order" convention `bar`, `pyramid`
 * and `cycle` all use rather than a position-identifying attribute.
 *
 * This is not a scatter plot: no item is placed at a computed (x, y). Each
 * quadrant is a bucket, and which bucket an item is in is the entire claim —
 * exactly the shape `readItems()` already returns for every other form, so
 * each cell's task list is read with it unmodified, `<li>` and all.
 *
 * Because nothing here is a hidden magnitude, there is no table. A cell's
 * meaning is carried entirely by its visible title and its visible items;
 * duplicating that in a table would echo, not add. The one thing genuinely at
 * risk of being position-only is a cell's *identity* — an untitled cell only
 * says what it means via where it sits relative to the axis labels, which is
 * exactly the kind of meaning-hidden-in-geometry problem this package exists
 * to flag, so a missing title advises.
 */

import { el, cls } from '../dom.js';
import { figure } from '../a11y.js';
import { readItems } from '../parse.js';
import { advise } from '../warn.js';

/** A quadrant is for narrowing down what to focus on; a cell with more items
 * than this has stopped doing that job. */
const MAX_ITEMS_PER_CELL = 6;

/** @type {import('./index.js').Form} */
export default function quadrant({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const cellHosts = [...host.children];

  if (cellHosts.length !== 4) {
    advise(
      `quadrant needs exactly four cells, top-left through bottom-right, got ${cellHosts.length}`,
      {
        element: host,
        hint: 'Write four <div data-label="…"> children, one per quadrant, each holding its own list.',
      },
    );
  }

  const cells = cellHosts.map((cellHost) => {
    const cellData = /** @type {HTMLElement} */ (cellHost).dataset;
    const label = cellData.label ?? '';

    if (!label) {
      advise('a quadrant cell has no data-label', {
        element: cellHost,
        hint: 'Without a title, the only way to know what this cell means is its position — name it.',
      });
    }

    const items = readItems(cellHost, 'item');
    if (items.length > MAX_ITEMS_PER_CELL) {
      advise(
        `"${label || 'untitled'}" has ${items.length} items; a quadrant is for narrowing down`,
        {
          element: cellHost,
          hint: `More than ${MAX_ITEMS_PER_CELL} items in one cell has stopped being a priority list.`,
        },
      );
    }

    return { label, items, emphasis: 'emphasis' in cellData };
  });

  const anyEmphasis = cells.some((cell) => cell.emphasis);
  if (data.emphasis && !anyEmphasis) {
    const index = Number.parseInt(data.emphasis, 10);
    if (Number.isFinite(index) && cells[index - 1]) cells[index - 1].emphasis = true;
  }

  const cellNodes = cells.map((cell, i) =>
    el(
      'div',
      {
        class: [cls('quadrant-cell'), cell.emphasis ? cls('quadrant-cell', 'on') : ''],
        style: { '--ig-i': i },
      },
      cell.label ? el('p', { class: cls('quadrant-title'), text: cell.label }) : null,
      cell.items.length
        ? el(
            'ul',
            { class: cls('quadrant-items') },
            ...cell.items.map((item) =>
              el('li', { class: cls('quadrant-item'), text: item.label }),
            ),
          )
        : null,
    ),
  );

  const visual = el(
    'div',
    { class: cls('quadrant') },
    data.xLabel ? el('p', { class: cls('quadrant-x-label'), text: data.xLabel }) : null,
    data.yLabel ? el('p', { class: cls('quadrant-y-label'), text: data.yLabel }) : null,
    el('div', { class: cls('quadrant-grid') }, ...cellNodes),
  );

  // States both axes and all four titles up front, the same "say what the
  // sighted layout shows" move cycle's closure-naming makes — giving an
  // overview before a reader drills into each cell's own (already-visible)
  // item list.
  const axes = [data.xLabel, data.yLabel].filter(Boolean).join(' vs. ');
  const titles = cells
    .map((cell) => cell.label)
    .filter(Boolean)
    .join(', ');
  const derived = [axes, titles].filter(Boolean).join(': ');

  return figure({
    form: 'quadrant',
    label: data.label ?? derived,
    visual,
    caption: data.caption,
  });
}
