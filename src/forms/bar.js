/**
 * bar — magnitude across categories, encoded as length on a common baseline.
 *
 *   <div data-infograph="bar" data-emphasis="2">
 *     <div data-item="Remote" data-value="34"></div>
 *     <div data-item="Office" data-value="52"></div>
 *   </div>
 *
 *   <div data-infograph="bar" data-items="Remote: 34, Office: 52"></div>
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
import { readItems, applyEmphasis, formatNumber } from '../parse.js';
import { resolveSymbol, symbolUrl } from '../design/symbols.js';
import { advise } from '../warn.js';

/** Past this many symbols the longest bar stops being countable and reads as texture. */
const MAX_SLOTS = 30;

/** @type {import('./index.js').Form} */
export default function bar({ host, config }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const items = applyEmphasis(readItems(host, 'item'), data.emphasis, host);

  if (!items.length) {
    advise('bar has no items', {
      element: host,
      hint: 'Add <div data-item="Label" data-value="34"></div> children, or data-items="Remote: 34, Office: 52".',
    });
  }

  const values = items.map((item) => (item.number.valid ? item.number.value : 0));
  // Zero baseline, and the scale is set by the largest bar rather than a round
  // number: nothing here is read off an axis, so a "nice" maximum would only
  // shorten every bar for no gain in accuracy.
  const max = Math.max(0, ...values.map(Math.abs)) || 1;
  const anyEmphasis = items.some((item) => item.emphasis);

  const symbol = resolveSymbol(config.symbol, config.symbolPath, host);
  const unit = symbol ? unitFor(data.igSymbolUnit, max, host) : 0;

  const rows = items.map((item, i) => {
    const magnitude = Math.abs(item.number.valid ? item.number.value : 0);
    const fillColour = anyEmphasis && !item.emphasis ? 'var(--ig-muted)' : 'var(--ig-mark-1)';

    const fill = symbol
      ? // Discrete slots, so the count is in the DOM and means something: one
        // symbol is `unit`, and a reader can check the chart by counting. Total
        // width is still (value / unit) × slot — exactly proportional to the
        // value, on the same left edge — so every claim the plain bar makes
        // survives, including the assertions that measure it.
        el(
          'div',
          {
            class: [cls('bar-fill'), cls('bar-fill', 'symbol')],
            style: { '--ig-bar-fill': fillColour },
          },
          ...slots(magnitude, unit, i),
        )
      : el('div', {
          class: cls('bar-fill'),
          style: {
            '--ig-bar-length': `${(magnitude / max) * 100}%`,
            '--ig-i': i,
            // With no emphasis every bar takes the primary mark colour: the
            // categories are the subject and share one identity. With emphasis
            // one bar keeps it and the rest drop to gray, so the highlight is
            // carried by contrast rather than by a colour the reader must learn.
            '--ig-bar-fill': fillColour,
          },
        });

    const track = el('div', { class: cls('bar-track') }, hideFromAt(fill));

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

  const unitKey = symbol ? unitLegend(unit, items) : null;

  const visual = el(
    'div',
    {
      class: [cls('bar'), symbol ? cls('bar', 'symbol') : ''],
      style: { '--ig-symbol': symbol ? symbolUrl(symbol) : null },
    },
    ...rows,
    unitKey,
  );

  return figure({
    form: 'bar',
    label: data.label ?? `Comparison of ${items.length} items`,
    visual,
    // The labels and values are already in the accessible tree in row order, so
    // the table exists to state the *relationship* — which column is which.
    table: dataTable({
      caption: data.label ?? 'Comparison',
      columns: ['Item', 'Value'],
      rows: items.map((item) => [item.label, item.number.valid ? item.number.text : '—']),
    }),
    caption: data.caption,
  });
}

/**
 * The symbols for one bar: whole ones, then a clipped remainder.
 *
 * The partial symbol at the end is the standard ISOTYPE way to show a fraction —
 * a half symbol is half a unit. It is a clip rather than a scaled-down glyph,
 * because a smaller symbol would mean "a smaller thing", not "less of them".
 *
 * @param {number} magnitude
 * @param {number} unit
 * @param {number} row  Feeds the entrance stagger.
 */
function slots(magnitude, unit, row) {
  const exact = magnitude / unit;
  const whole = Math.floor(exact);
  const remainder = exact - whole;

  /** @type {HTMLElement[]} */
  const out = [];

  for (let i = 0; i < whole; i++) {
    out.push(el('span', { class: cls('bar-glyph'), style: { '--ig-i': row * 4 + i } }));
  }

  if (remainder > 0.001) {
    out.push(
      // The clipper is sized to the fraction; the symbol inside stays a full
      // slot wide, so what you see is a vertically-sliced glyph.
      el(
        'span',
        {
          class: cls('bar-glyph-partial'),
          style: { '--ig-symbol-fraction': remainder, '--ig-i': row * 4 + whole },
        },
        el('span', { class: cls('bar-glyph') }),
      ),
    );
  }

  return out;
}

/**
 * What one symbol is worth.
 *
 * An ISOTYPE chart without a stated unit is unreadable — the count is the whole
 * point, so "a count of what?" has to be answered. If the author says, we use
 * their number; otherwise we pick a round one and print it, because a derived
 * unit that nobody mentions is worse than no symbols at all.
 *
 * @param {string|undefined} raw  `data-ig-symbol-unit`
 * @param {number} max
 * @param {Element} host
 */
function unitFor(raw, max, host) {
  const asked = Number(raw);
  const unit = Number.isFinite(asked) && asked > 0 ? asked : niceUnit(max);

  const slotCount = Math.ceil(max / unit);
  if (slotCount > MAX_SLOTS) {
    advise(`the longest bar is ${slotCount} symbols; past ~${MAX_SLOTS} nobody counts them`, {
      element: host,
      hint: `Raise data-ig-symbol-unit so one symbol carries more (try ${niceUnit(max)}). A row of symbols people cannot count is a textured bar with extra steps.`,
    });
  }

  return unit;
}

/**
 * A round number that puts roughly a dozen symbols on the longest bar.
 *
 * 1, 2, 2.5 and 5 × a power of ten — the same family of steps an axis would
 * use, because "one symbol = 2.5 units" is readable and "one symbol = 3.7" is
 * not.
 *
 * @param {number} max
 */
function niceUnit(max) {
  const target = max / 12;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const step of [1, 2, 2.5, 5]) {
    if (target <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

/**
 * The "one symbol = N" key.
 *
 * Not the legend principle 3 argues against: that one is a colour→name mapping
 * held in working memory while reading elsewhere. This is a scale statement,
 * like an axis label, and it stays in the accessible tree because a screen
 * reader needs it as much as anyone.
 *
 * @param {number} unit
 * @param {import('../parse.js').Item[]} items
 */
function unitLegend(unit, items) {
  // Borrow the author's own formatting, so "one symbol = 10 days" rather than
  // a bare 10 next to a column of values that all carry a suffix.
  const spec = items.find((item) => item.number.valid)?.number;
  const text = spec ? formatNumber(unit, { ...spec, plus: false }) : String(unit);

  return el(
    'p',
    { class: cls('bar-unit') },
    el('span', { class: [cls('bar-glyph'), cls('bar-glyph', 'key')] }),
    el('span', { text: `= ${text}` }),
  );
}
