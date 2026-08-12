/**
 * waffle — one share of a whole, made countable.
 *
 *   <div data-infograph="waffle" data-value="43.8%" data-label="Respondents who agreed"></div>
 *
 * The alternative for this data is a pie, and the pie loses. Reading a share
 * off a pie means judging an angle or an area — fourth and fifth in Cleveland &
 * McGill's accuracy ranking. A 10×10 grid replaces that judgement with
 * counting, and counting whole rows is close to exact: four full rows and four
 * cells *is* 44, not "looks like a bit under a half".
 *
 * One hue plus gray, always. The filled cells are the subject; the rest is the
 * denominator and should recede. A second colour here would imply a second
 * category, which is not what this form says.
 *
 * Rounding is to the nearest cell and is stated: the printed value stays the
 * author's exact number, so nobody has to reverse-engineer 43.8 from 44 cells.
 */

import { el, cls } from '../dom.js';
import { figure, hideFromAt, dataTable } from '../a11y.js';
import { parseNumber, formatNumber } from '../parse.js';
import { WAFFLE } from '../design/tokens.js';
import { resolveSymbol, symbolUrl } from '../design/symbols.js';
import { advise } from '../warn.js';

/** @type {import('./index.js').Form} */
export default function waffle({ host, config }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const number = parseNumber(data.value);
  const label = data.label ?? '';

  const total = Number(data.total ?? WAFFLE.total);
  const share = shareOf(number, total, host);
  const filled = Math.round(share * WAFFLE.total);

  // A silhouette changes what shape each cell is painted in and nothing else:
  // still a hundred cells, still one per unit, still counted in rows. That is
  // the whole reason it is allowed — see src/design/symbols.js.
  const symbol = resolveSymbol(config.symbol, config.symbolPath, host);

  const grid = el('div', {
    class: cls('waffle-grid'),
    style: { '--ig-waffle-columns': WAFFLE.columns },
  });

  for (let i = 0; i < WAFFLE.total; i++) {
    grid.append(
      el('span', {
        class: [cls('waffle-cell'), i < filled ? cls('waffle-cell', 'on') : ''],
        // Stagger runs along the fill, so the animation reads as the quantity
        // accumulating rather than as a hundred independent cells appearing.
        style: { '--ig-i': i },
      }),
    );
  }

  const visual = el(
    'div',
    {
      class: [cls('waffle'), symbol ? cls('waffle', 'symbol') : ''],
      // Set once here and inherited by all 100 cells, rather than written onto
      // each of them: custom properties inherit, so this is one string in the
      // DOM instead of a hundred copies of the same data URI.
      style: { '--ig-symbol': symbol ? symbolUrl(symbol) : null },
    },
    hideFromAt(grid),
    el(
      'div',
      { class: cls('waffle-legend') },
      el('span', { class: cls('waffle-value'), text: number.valid ? number.text : '—' }),
      label ? el('span', { class: cls('waffle-label'), text: label }) : null,
    ),
  );

  const remainder = number.valid ? formatNumber(total - number.value, number) : '—';

  return figure({
    form: 'waffle',
    label: `${number.text || '—'} ${label}`.trim(),
    visual,
    // The grid is aria-hidden, so without this a reader gets the headline and
    // nothing else. Two rows is enough: a share and its complement.
    table: dataTable({
      caption: label || 'share of total',
      columns: ['Segment', 'Value'],
      rows: [
        [label || 'share', number.valid ? number.text : '—'],
        ['Remainder', remainder],
      ],
    }),
    caption: data.caption,
  });
}

/**
 * The fraction to fill, 0–1.
 *
 * `data-value="43.8%"` is a percentage of 100; `data-value="438" data-total="1000"`
 * is a count out of an explicit total. Both are common in a deck and telling
 * them apart from the `%` suffix is less surprising than a `data-mode` flag.
 *
 * @param {import('../parse.js').NumberSpec} number
 * @param {number} total
 * @param {Element} host
 */
function shareOf(number, total, host) {
  if (!number.valid) {
    advise('waffle has no readable data-value', {
      element: host,
      hint: 'Write a share: data-value="43.8%", or a count with data-total="1204".',
    });
    return 0;
  }

  const share = number.value / (number.percent ? 100 : total);

  if (share < 0 || share > 1) {
    advise(`waffle share is ${(share * 100).toFixed(1)}% — outside 0–100%`, {
      element: host,
      hint: 'A waffle is a part of a whole. For values that exceed their reference, a bar makes the overshoot visible instead of clipping it.',
    });
  }

  return Math.max(0, Math.min(1, share));
}
