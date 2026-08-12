/**
 * Authored markup → normalised data.
 *
 * Everything a form receives comes through here, so the rules about what
 * `data-value="43.8%"` means are stated once. Two principles:
 *
 *   1. Never lose the author's formatting. `1,234` keeps its separator,
 *      `43.8` keeps its decimal, `+12` keeps its sign, `¥` and `%` stay put.
 *      A figure that silently reformats numbers makes the author fight it.
 *   2. Never throw on bad input. A malformed value degrades to text — a talk
 *      with one wrong-looking number beats a talk with a blank slide.
 */

import { advise } from './warn.js';

/**
 * @typedef {object} NumberSpec
 * @property {number} value      The numeric value.
 * @property {string} text       Exactly what the author wrote.
 * @property {string} prefix     Anything before the digits (currency, etc).
 * @property {string} suffix     Anything after (%, days, ×…).
 * @property {number} decimals   Fractional digits the author used.
 * @property {boolean} grouped   Author used thousands separators.
 * @property {boolean} plus      Author wrote an explicit leading `+`.
 * @property {boolean} percent   The suffix is a percent sign.
 * @property {boolean} valid     False when no number could be read.
 */

/** A grouped number (1,234.5) or a plain one (43.8), with an optional sign. */
const NUMBER_RE = /[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?|[+-]?\d+(?:\.\d+)?/;

/**
 * Read a number out of authored text, keeping its presentation.
 *
 * @param {string|null|undefined} raw
 * @returns {NumberSpec}
 */
export function parseNumber(raw) {
  const text = (raw ?? '').trim();
  const match = text.match(NUMBER_RE);

  if (!match) {
    return {
      value: NaN,
      text,
      prefix: '',
      suffix: '',
      decimals: 0,
      grouped: false,
      plus: false,
      percent: false,
      valid: false,
    };
  }

  const token = match[0];
  const start = /** @type {number} */ (match.index);
  const [, frac = ''] = token.split('.');

  return {
    value: Number(token.replace(/,/g, '')),
    text,
    prefix: text.slice(0, start),
    suffix: text.slice(start + token.length),
    decimals: frac.length,
    grouped: token.includes(','),
    plus: token.startsWith('+'),
    percent: /^\s*%/.test(text.slice(start + token.length)),
    valid: true,
  };
}

/**
 * Render a value back in the author's own format. Used when a form derives a
 * number the author did not write (a remainder, a difference) and has to make
 * it look like it belongs next to the ones they did.
 *
 * @param {number} value
 * @param {NumberSpec} spec
 */
export function formatNumber(value, spec) {
  const fixed = Math.abs(value).toFixed(spec.decimals);
  const [, frac] = fixed.split('.');
  let int = fixed.split('.')[0];
  if (spec.grouped) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 ? '-' : spec.plus ? '+' : '';
  return spec.prefix + sign + int + (frac ? '.' + frac : '') + spec.suffix;
}

/**
 * @typedef {object} Item
 * @property {string} label      What to print next to the mark.
 * @property {NumberSpec} number Parsed value (may be invalid for label-only forms).
 * @property {string} [note]     Secondary line.
 * @property {boolean} emphasis  Whether this is the one item to highlight.
 * @property {Element} [source]  The authored element, if there was one.
 */

/**
 * Read a form's items from child elements, e.g.
 *
 *   <div data-infograph="bar">
 *     <div data-item="Remote" data-value="34"></div>
 *     <div data-item="Office" data-value="52" data-emphasis></div>
 *   </div>
 *
 * The child's own text content is used as the note when present, so a step in a
 * flow can carry a sentence without another attribute:
 *
 *   <div data-step="Problem">Fragmented teams</div>
 *
 * @param {Element} host
 * @param {string} key  The `data-*` name that marks a child: 'item', 'step', …
 * @returns {Item[]}
 */
export function readChildItems(host, key) {
  const selector = `[data-${key}]`;
  /** @type {Item[]} */
  const items = [];

  for (const child of host.children) {
    if (!child.matches(selector)) continue;
    const data = /** @type {HTMLElement} */ (child).dataset;
    const label = data[key] ?? '';
    const note = child.textContent?.trim() || undefined;

    items.push({
      label,
      number: parseNumber(data.value),
      note,
      emphasis: 'emphasis' in data,
      source: child,
    });
  }

  return items;
}

/**
 * Shorthand for the common two-or-three item case, so a comparison does not
 * need child elements at all:
 *
 *   data-items="Remote: 34, Office: 52"
 *
 * Both ASCII and full-width punctuation separate the parts (`:` and `：`, `,`
 * and `、`), because the decks this was built for are written in Japanese and
 * full-width is simply what a Japanese IME produces — an author should not have
 * to switch input modes halfway through an attribute.
 *
 * @param {string|null|undefined} raw
 * @returns {Item[]}
 */
export function parseItemList(raw) {
  if (!raw) return [];

  return raw
    .split(/[,、]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const split = entry.search(/[:：]/);
      const label = split === -1 ? entry : entry.slice(0, split).trim();
      const value = split === -1 ? '' : entry.slice(split + 1).trim();
      return {
        label,
        number: parseNumber(value),
        emphasis: false,
      };
    });
}

/**
 * The items for a form, from whichever notation the author used.
 *
 * Child elements win over the `data-items` shorthand when both are present:
 * the longhand is what you reach for when the shorthand ran out of room, so it
 * is the more deliberate of the two.
 *
 * @param {Element} host
 * @param {string} key
 * @returns {Item[]}
 */
export function readItems(host, key) {
  const children = readChildItems(host, key);
  if (children.length) return children;
  return parseItemList(/** @type {HTMLElement} */ (host).dataset.items);
}

/**
 * Apply the "highlight exactly one thing" rule.
 *
 * `data-emphasis="2"` (1-based) or `data-emphasis` on a child both work. If the
 * author marks several, the first wins and the rest are dropped — two competing
 * highlights is the same as none, since the eye has nowhere to land.
 *
 * @param {Item[]} items
 * @param {string|undefined} attr  The host's `data-emphasis` value.
 * @param {Element} [host]         For the advisory message.
 * @returns {Item[]}
 */
export function applyEmphasis(items, attr, host) {
  const marked = items.filter((item) => item.emphasis);

  if (marked.length > 1) {
    advise('several items are marked data-emphasis; only the first is highlighted', {
      element: host,
      hint: 'Signalling only works when one thing stands out. Emphasise one item, or none.',
    });
    marked.slice(1).forEach((item) => (item.emphasis = false));
    return items;
  }

  if (marked.length === 1) return items;

  const index = Number.parseInt(attr ?? '', 10);
  if (Number.isFinite(index) && items[index - 1]) items[index - 1].emphasis = true;

  return items;
}
