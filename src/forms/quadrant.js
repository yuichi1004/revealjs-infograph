/**
 * quadrant — four named buckets on two axes, Eisenhower-matrix style.
 *
 *   <div data-infograph="quadrant"
 *        data-x-label="Urgency"    data-columns="Urgent, Not urgent"
 *        data-y-label="Importance" data-rows="Important, Not important">
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
 * **Both ends of each axis get a name.** An axis label alone says only *what* is
 * measured, never *which way* it grows, and a reader is left to reverse-engineer
 * the direction from the cell titles. In the Eisenhower matrix they will usually
 * get it wrong: urgency increases leftward and importance upward, the opposite
 * of the "right and up mean more" convention every other chart teaches. So
 * `data-columns` names the left and right columns and `data-rows` names the top
 * and bottom rows, which puts the direction in text where assistive tech gets it
 * for free.
 *
 * No arrow, deliberately. A quadrant's axes are *binary* — four buckets is two
 * levels by two levels — so an arrow would imply a continuum the form does not
 * have, and would put the direction back into geometry, which is the problem it
 * was meant to solve.
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
import { readItems, applyEmphasis } from '../parse.js';
import { iconFor, checkIcons } from '../icon.js';
import { advise } from '../warn.js';

/** A quadrant is for narrowing down what to focus on; a cell with more items
 * than this has stopped doing that job. */
const MAX_ITEMS_PER_CELL = 6;

/**
 * Split an axis's two end labels out of one attribute.
 *
 * Deliberately not `parseItemList()`: that one also splits on `:` to pull out a
 * value, which would quietly turn a header like "Q1: strong" into the label
 * "Q1". These are plain strings, not `label: value` pairs.
 *
 * @param {string|undefined} raw
 * @returns {string[]}
 */
function poles(raw) {
  if (!raw) return [];
  return raw
    .split(/[,、]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

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

    return {
      label,
      items,
      emphasis: 'emphasis' in cellData,
      icon: iconFor(cellHost),
      source: cellHost,
    };
  });

  // Same "one host attribute, or a marked child, never both contradicting
  // each other" rule every other item form gets from readItems() — cells
  // aren't Items (they come straight from host.children, not readItems()),
  // but applyEmphasis() only ever needs an `.emphasis` boolean per entry, so
  // it applies here unchanged rather than this form re-deriving its own
  // (previously narrower — see git history) copy of the same rule.
  applyEmphasis(cells, data.emphasis, host);

  checkIcons(cells, host, 'quadrant cell');

  const cellNodes = cells.map((cell, i) => {
    // A head row only exists when there is an icon to put in it — with none,
    // the title stays the same lone <p> this form has always emitted, so a
    // plain quadrant's markup (and baseline screenshot) does not move at all.
    const title = cell.label ? el('p', { class: cls('quadrant-title'), text: cell.label }) : null;
    const head = cell.icon ? el('div', { class: cls('quadrant-head') }, cell.icon, title) : title;

    return el(
      'div',
      {
        class: [cls('quadrant-cell'), cell.emphasis ? cls('quadrant-cell', 'on') : ''],
        style: { '--ig-i': i },
      },
      head,
      cell.items.length
        ? el(
            'ul',
            { class: cls('quadrant-items') },
            ...cell.items.map((item) =>
              el('li', { class: cls('quadrant-item'), text: item.label }),
            ),
          )
        : null,
    );
  });

  const columns = poles(data.columns);
  const rows = poles(data.rows);

  /*
   * Headers go into the same grid as the cells, in reading order, so the grid
   * fills row-major with no explicit positioning:
   *
   *   (corner)   Urgent      Not urgent
   *   Important  Do First    Schedule
   *   Not imp.   Delegate    Eliminate
   *
   * The corner spacer only exists when both axes are headed — that is what
   * keeps auto-placement correct across all four combinations (both, columns
   * only, rows only, neither) without a single grid-column declaration.
   */
  const gridChildren = [];
  if (columns.length) {
    if (rows.length) gridChildren.push(el('div', { class: cls('quadrant-corner') }));
    for (const name of columns) {
      gridChildren.push(el('p', { class: cls('quadrant-col-header'), text: name }));
    }
  }
  cellNodes.forEach((node, i) => {
    // A row header leads its own row: index 0 before the first cell, index 1
    // before the third.
    if (rows.length && i % 2 === 0) {
      const name = rows[i / 2];
      if (name) gridChildren.push(el('p', { class: cls('quadrant-row-header'), text: name }));
    }
    gridChildren.push(node);
  });

  const visual = el(
    'div',
    { class: cls('quadrant') },
    data.xLabel ? el('p', { class: cls('quadrant-x-label'), text: data.xLabel }) : null,
    data.yLabel ? el('p', { class: cls('quadrant-y-label'), text: data.yLabel }) : null,
    el(
      'div',
      {
        class: [
          cls('quadrant-grid'),
          columns.length ? cls('quadrant-grid', 'col-headed') : '',
          rows.length ? cls('quadrant-grid', 'row-headed') : '',
        ],
      },
      ...gridChildren,
    ),
  );

  // States both axes and all four titles up front, the same "say what the
  // sighted layout shows" move cycle's closure-naming makes — giving an
  // overview before a reader drills into each cell's own (already-visible)
  // item list.
  //
  // The poles go in parentheses after their dimension, because the direction is
  // the thing a reader cannot recover from position alone. With no poles given
  // this degrades to exactly the string it produced before they existed.
  const axis = (/** @type {string|undefined} */ name, /** @type {string[]} */ ends) =>
    ends.length ? `${name ? `${name} ` : ''}(${ends.join(' / ')})`.trim() : (name ?? '');

  const axes = [axis(data.xLabel, columns), axis(data.yLabel, rows)].filter(Boolean).join(' vs. ');
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
