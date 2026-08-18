/**
 * pyramid — a hierarchy, narrowest at the top.
 *
 *   <div data-infograph="pyramid">
 *     <ul>
 *       <li>Self-actualization</li>
 *       <li>Esteem</li>
 *       <li>Love and belonging</li>
 *       <li>Safety needs</li>
 *       <li>Physiological needs</li>
 *     </ul>
 *   </div>
 *
 * First item is the apex, last is the base — the same order a reader already
 * scans a list in, so the DOM needs no extra markup to state the hierarchy.
 *
 * The tier widths are geometry, not data: this form makes the same argument
 * `venn` already makes for area — the claim is topological ("this sits above
 * that"), and there is no magnitude being judged. A pyramid whose widths *did*
 * encode a value would be the trapezoid version of a pie chart: area grows
 * faster than width, so a reader judging area misjudges the number. A tier
 * that carries `data-value` gets it printed, and gets advised toward `bar` or
 * `waffle` — the forms whose geometry actually is proportional.
 *
 * Every tier is one mark colour. Tiers are ranks, not categories, so a colour
 * per tier would claim a distinction that is not there; `data-emphasis` picks
 * out one or more tiers the same way it picks out bars.
 */

import { el, cls } from '../dom.js';
import { figure, hideFromAt } from '../a11y.js';
import { readItems, applyEmphasis } from '../parse.js';
import { checkIcons } from '../icon.js';
import { advise } from '../warn.js';

/**
 * Read top-to-bottom, one tier at a time — Miller's span for sequential recall,
 * not `maxSeries` (that one is about chunks held *simultaneously* while
 * decoding a chart, which is a different task). Maslow's own hierarchy is five
 * levels; a package that advised against its flagship example would not be
 * trusted on this number, so it stays comfortably above that.
 */
const MAX_TIERS = 7;

/** @type {import('./index.js').Form} */
export default function pyramid({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const items = applyEmphasis(readItems(host, 'level'), data.emphasis);

  if (items.length < 2) {
    advise('pyramid needs at least two levels', {
      element: host,
      hint: 'A single level is not a hierarchy — a stat says it with less furniture.',
    });
  }

  if (items.length > MAX_TIERS) {
    advise(
      `pyramid has ${items.length} levels; more than ${MAX_TIERS} is hard to read top-to-bottom`,
      {
        element: host,
        hint: 'Group related levels together, or split across slides.',
      },
    );
  }

  if (items.some((item) => item.number.valid)) {
    advise('pyramid width states hierarchy, not magnitude — data-value is shown but not encoded', {
      element: host,
      hint: 'For a quantitative story, use bar (length on a common baseline) or waffle (a share of a whole).',
    });
  }

  checkIcons(items, host, 'pyramid tier');

  const n = items.length || 1;
  const anyEmphasis = items.some((item) => item.emphasis);

  const rows = items.map((item, i) => {
    // Trapezoid corners, as percentages of the band's own box. Tier 0 (the
    // apex) closes to a point at the top; the last tier spans the full width
    // at the bottom. Every band is the *same* box — the column width is fixed
    // by the shared grid below — so the narrowing comes entirely from the
    // clip, the same way venn's lens comes entirely from a clip rather than
    // from a smaller circle.
    const topLeft = 50 - (50 * i) / n;
    const topRight = 50 + (50 * i) / n;
    const bottomLeft = 50 - (50 * (i + 1)) / n;
    const bottomRight = 50 + (50 * (i + 1)) / n;

    // Builds base-up: the base is the argument's foundation, so it is the
    // first thing to settle, and the apex — which depends on everything under
    // it — is the last. Set on both the band and the label so a tier's shape
    // and its name arrive together.
    const stagger = n - 1 - i;

    const band = el('span', {
      class: cls('pyramid-band'),
      style: {
        '--ig-pyramid-clip': `polygon(${topLeft}% 0%, ${topRight}% 0%, ${bottomRight}% 100%, ${bottomLeft}% 100%)`,
        '--ig-i': stagger,
        '--ig-pyramid-fill': anyEmphasis && !item.emphasis ? 'var(--ig-muted)' : 'var(--ig-mark-1)',
      },
    });

    const label = el(
      'span',
      { class: cls('pyramid-label'), style: { '--ig-i': stagger } },
      item.icon,
      el('span', { class: cls('pyramid-label-text'), text: item.label }),
      item.number.valid
        ? el('span', { class: cls('pyramid-label-value'), text: item.number.text })
        : null,
    );

    return el(
      'div',
      { class: [cls('pyramid-row'), item.emphasis ? cls('pyramid-row', 'on') : ''] },
      hideFromAt(band),
      label,
    );
  });

  const visual = el('div', { class: cls('pyramid') }, ...rows);

  return figure({
    form: 'pyramid',
    // Comma, not '→' — flow and cycle earn the arrow because their items are a
    // real sequence; a pyramid's tiers are rank, not sequence, so an arrow-joined
    // name would hand a screen reader a fabricated process ("A → B → C") where a
    // sighted reader sees a hierarchy. Matches the join quadrant already uses for
    // its own same-level, non-sequential items (src/forms/quadrant.js).
    label:
      data.label ??
      items
        .map((item) => item.label)
        .filter(Boolean)
        .join(', '),
    visual,
    // No hidden table: like flow, the tier labels are already real text in the
    // accessible tree, in rank order. Duplicating them would just be an echo.
    caption: data.caption,
  });
}
