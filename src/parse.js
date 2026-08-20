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

import { iconFor } from './icon.js';

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
 * @property {boolean} emphasis  Whether this is one of the items to highlight.
 * @property {Element|null} [icon] This item's `data-icon`/`data-icon-path`/
 *   `data-icon-src`/inline `<svg data-icon>`, already resolved to a node — see
 *   src/icon.js. Always
 *   `null` for items read from the `data-items="A, B"` shorthand, which has no
 *   attribute space for a fourth per-item fact.
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

    items.push({
      label,
      number: parseNumber(data.value),
      note: noteFrom(child),
      emphasis: 'emphasis' in data,
      icon: iconFor(child),
      source: child,
    });
  }

  return items;
}

/**
 * A child's own text, for the `note` field — with an inline `<svg data-icon>`
 * subtree excluded. An icon's shape is not something to read aloud, and
 * without this exclusion a stray `<title>` or text node inside it would leak
 * into the note.
 *
 * @param {Element} child
 * @returns {string|undefined}
 */
function noteFrom(child) {
  const icon = child.querySelector(':scope > svg[data-icon]');
  if (!icon) return child.textContent?.trim() || undefined;

  const withoutIcon = /** @type {Element} */ (child.cloneNode(true));
  withoutIcon.querySelector(':scope > svg[data-icon]')?.remove();
  return withoutIcon.textContent?.trim() || undefined;
}

/**
 * Read a form's items from a plain `<ul>`/`<ol>`, so a figure can be authored
 * from a reveal.js Markdown list instead of `data-*` children:
 *
 *   <div data-infograph="pyramid">
 *     <ul>
 *       <li>Self-actualization</li>
 *       <li>Esteem</li>
 *     </ul>
 *   </div>
 *
 * Only the first direct `<ul>`/`<ol>` is read, and only its own `<li>`
 * children — a nested list inside one item's prose is left alone rather than
 * flattened into extra items.
 *
 * `data-value` on the `<li>` itself works exactly as it does on a `data-item`
 * child. Failing that, `label: value` is split out of the text — but *only*
 * when the part after the colon actually parses as a number, so a label that
 * happens to contain a colon ("Safety: the foundation of the rest") is not
 * misread as data. A colon that does not parse just stays part of the label.
 *
 * @param {Element} host
 * @returns {Item[]}
 */
function readListItems(host) {
  const list = host.querySelector(':scope > ul, :scope > ol');
  if (!list) return [];

  /** @type {Item[]} */
  const items = [];

  for (const li of list.children) {
    if (li.tagName !== 'LI') continue;
    const data = /** @type {HTMLElement} */ (li).dataset;
    const text = li.textContent?.trim() ?? '';
    const emphasis = 'emphasis' in data;

    const icon = iconFor(li);

    if (data.value !== undefined) {
      items.push({ label: text, number: parseNumber(data.value), emphasis, icon, source: li });
      continue;
    }

    const split = text.search(/[:：]/);
    const candidate = split === -1 ? null : parseNumber(text.slice(split + 1).trim());

    if (candidate?.valid) {
      items.push({
        label: text.slice(0, split).trim(),
        number: candidate,
        emphasis,
        icon,
        source: li,
      });
    } else {
      items.push({ label: text, number: parseNumber(undefined), emphasis, icon, source: li });
    }
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
        // No attribute space in this shorthand for a fourth per-item fact —
        // see the Item typedef above.
        icon: null,
      };
    });
}

/**
 * The items for a form, from whichever notation the author used.
 *
 * In order: `data-*` children, then a plain `<ul>`/`<ol>`, then the
 * `data-items` shorthand. Each is what you reach for when the previous one
 * does not fit — `data-*` children are the most deliberate, a Markdown list is
 * what a slide already looks like, and the shorthand is for when even that is
 * too much markup for one line.
 *
 * @param {Element} host
 * @param {string} key
 * @returns {Item[]}
 */
export function readItems(host, key) {
  const children = readChildItems(host, key);
  if (children.length) return children;

  const listItems = readListItems(host);
  if (listItems.length) return listItems;

  return parseItemList(/** @type {HTMLElement} */ (host).dataset.items);
}

/**
 * Apply the "highlight a deliberate subset" rule.
 *
 * `data-emphasis="2"` marks one item (1-based); `data-emphasis="2,4"` marks
 * several. A child's own bare `data-emphasis` attribute works the same way,
 * and marking more than one child is honoured rather than trimmed to the
 * first — the host attribute is only consulted when no child already carries
 * one. Full-width `、` is accepted alongside `,`, matching every other list
 * this package reads (see `parseItemList` above), since these decks are
 * written in Japanese.
 *
 * Generic over anything with a mutable `emphasis` flag, not just `Item` —
 * `quadrant`'s cells go through this too (src/forms/quadrant.js), and they
 * carry a `label`/`items`/`icon` shape of their own, not a parsed number.
 *
 * @template {{ emphasis: boolean }} T
 * @param {T[]} items
 * @param {string|undefined} attr  The host's `data-emphasis` value.
 * @returns {T[]}
 */
export function applyEmphasis(items, attr) {
  if (items.some((item) => item.emphasis)) return items;

  for (const token of (attr ?? '').split(/[,、]/)) {
    const index = Number.parseInt(token.trim(), 10);
    if (Number.isFinite(index) && items[index - 1]) items[index - 1].emphasis = true;
  }

  return items;
}
