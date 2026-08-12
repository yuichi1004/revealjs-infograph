/**
 * Per-element icons — `data-icon`, `data-icon-path`, or an inline `<svg data-icon>`.
 *
 * These are not `data-ig-symbol` marks (see src/design/symbols.js), and the
 * difference is the whole reason this feature is allowed to exist alongside
 * principle 5's ban on decoration:
 *
 *   An icon names, it never measures.
 *
 * A symbol is a mark repeated once per unit, so its *count* carries the data —
 * that is what principle 5b's "a sign is repeated, never enlarged" rule
 * protects. An icon here is placed exactly once, next to the one label it
 * names, and it never varies in size. It adds no encoding a reader has to
 * decode; it is a second, fixed-size restatement of an identity the visible
 * text already states — the dual-coding case, not a chart channel. The moment
 * an icon's size tracked a value it would become exactly the area-judgement
 * failure principle 5b exists to forbid, so nothing here exposes a way to do
 * that.
 *
 * Three rules fall out, each one enforced by a test rather than left as a
 * suggestion:
 *
 *   1. Fixed size — every icon in a figure is the same size (CSS, not this
 *      module: see `--ig-icon-size` in styles/infograph.css).
 *   2. Never alone — an icon is `aria-hidden`, so on an element with no text
 *      label it says nothing to a screen reader. The forms advise when they
 *      see one.
 *   3. All or nothing — a lone icon among plain siblings is a preattentive
 *      singleton competing with `data-emphasis` for principle 4's one
 *      signalling channel. The forms advise on partial application too.
 */

import { el, cls } from './dom.js';
import { hideFromAt } from './a11y.js';
import { resolveSymbol, symbolUrl } from './design/symbols.js';
import { advise } from './warn.js';

/**
 * Read an icon off one element: an inline `<svg data-icon>` child wins over
 * `data-icon-path`, which wins over `data-icon` — most explicit first, the
 * same precedence `resolveSymbol()` already gives a custom path over a name.
 *
 * @param {Element} source The element that carries `data-icon`/`data-icon-path`.
 * @returns {Element|null}
 */
export function iconFor(source) {
  const data = /** @type {HTMLElement} */ (source).dataset;
  const inline = source.querySelector(':scope > svg[data-icon]');

  if (inline) {
    // Cloned, not moved: the authored element is left intact, so re-rendering
    // (a live deck re-runs forms on navigation) stays idempotent instead of
    // stealing the node out of the DOM on its first pass.
    const clone = /** @type {SVGElement} */ (inline.cloneNode(true));
    clone.removeAttribute('data-icon');
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    return hideFromAt(
      el('span', { class: [cls('icon'), cls('icon', 'inline')] }, hideFromAt(clone)),
    );
  }

  const symbol = resolveSymbol(data.icon, data.iconPath, source);
  if (!symbol) return null;

  return hideFromAt(
    el('span', {
      class: cls('icon'),
      style: { '--ig-icon-image': symbolUrl(symbol) },
    }),
  );
}

/**
 * Whether an element asked for an icon at all — used by a form to decide
 * whether to read one out (and whether its "all or nothing" advisory applies)
 * without building the DOM twice.
 *
 * @param {Element} source
 * @returns {boolean}
 */
export function hasIcon(source) {
  const data = /** @type {HTMLElement} */ (source).dataset;
  return Boolean(data.icon || data.iconPath || source.querySelector(':scope > svg[data-icon]'));
}

/**
 * @typedef {object} Iconable
 * @property {string} label
 * @property {Element|null} [icon]
 * @property {Element} [source]
 */

/**
 * Rules 2 and 3 from the module doc above, checked once per figure: an icon
 * needs its element's own label to mean anything to a screen reader, and a
 * figure needs every element iconed or none, or the one that stands out reads
 * as `data-emphasis` rather than as decoration that happens to be tasteful.
 *
 * @param {Iconable[]} items
 * @param {Element} host   The figure's own host, for the coverage advisory.
 * @param {string} noun    Singular, e.g. "flow step", "pyramid tier".
 */
export function checkIcons(items, host, noun) {
  const withIcon = items.filter((item) => item.icon);

  if (withIcon.length && withIcon.length < items.length) {
    advise(`some ${noun}s have data-icon and some do not`, {
      element: host,
      hint: 'A lone icon reads as emphasis, not decoration. Give every one an icon, or none.',
    });
  }

  for (const item of withIcon) {
    if (!item.label) {
      advise(`a ${noun} has data-icon but no visible label`, {
        element: item.source ?? host,
        hint: 'An icon is aria-hidden — without a label a screen reader gets nothing here.',
      });
    }
  }
}
