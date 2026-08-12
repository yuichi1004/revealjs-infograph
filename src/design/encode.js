/**
 * Choosing the visual encoding — the part that makes this package opinionated
 * rather than just convenient.
 *
 * Cleveland & McGill's ranking of elementary perceptual tasks is the backbone:
 * people judge *position along a common scale* most accurately, then length,
 * then angle, then area, then colour saturation, then hue. A form that encodes
 * a quantity as area when position was available has traded accuracy for
 * decoration.
 *
 * Two jobs here:
 *
 *   recommendForm()  `data-infograph="auto"` + `data-intent` → a form name.
 *   checkEncoding()  the author picked a form; say so if it fights the data.
 *
 * Both are advisory. Neither ever refuses to render.
 */

import { advise } from '../warn.js';

/**
 * @typedef {'compare'|'part-of-whole'|'change'|'flow'|'overlap'|'single'|'hierarchy'} Intent
 */

/**
 * What each intent should look like, and why.
 *
 * Note what is absent: there is no pie. A pie asks the reader to compare angles
 * and areas, the two weakest tasks in the ranking, to answer a question a
 * waffle or a bar answers with position. `part-of-whole` therefore resolves to
 * a waffle for one share and stacked bars for several.
 */
const BY_INTENT = {
  /** Ranking or magnitude across categories → length on a common baseline. */
  compare: 'bar',
  /** One share of a total → a countable grid, not an angle. */
  'part-of-whole': 'waffle',
  /** Before and after a single intervention → two anchored values. */
  change: 'compare',
  /** Ordered stages → left-to-right sequence with explicit connectors. */
  flow: 'flow',
  /** Set relationships → the one case where area genuinely is the message. */
  overlap: 'venn',
  /** A single headline number → type, not a chart. */
  single: 'stat',
  /** Ranked levels → narrowest at the top, geometry stating rank, not magnitude. */
  hierarchy: 'pyramid',
};

/**
 * @param {Intent|string|undefined} intent
 * @param {number} itemCount
 * @param {Element} [host]
 * @returns {string} A form name.
 */
export function recommendForm(intent, itemCount, host) {
  if (intent && intent in BY_INTENT) {
    const form = BY_INTENT[/** @type {Intent} */ (intent)];
    // Two items with a before/after reading are better served by the compare
    // form than by a two-bar chart, which spends a whole axis on one contrast.
    if (form === 'bar' && itemCount === 2) return 'compare';
    return form;
  }

  if (!intent) {
    advise('data-infograph="auto" needs a data-intent to choose a form', {
      element: host,
      hint: `Add one of: ${Object.keys(BY_INTENT).join(', ')}. Falling back to a bar chart.`,
    });
    return 'bar';
  }

  advise(`unknown data-intent="${intent}"`, {
    element: host,
    hint: `Known intents: ${Object.keys(BY_INTENT).join(', ')}.`,
  });
  return 'bar';
}

/**
 * Sanity-check a chosen form against the data it was handed.
 *
 * @param {object} spec
 * @param {string} spec.form
 * @param {import('../parse.js').Item[]} spec.items
 * @param {import('../options.js').InfographConfig} spec.config
 * @param {Element} spec.host
 */
export function checkEncoding({ form, items, config, host }) {
  if (items.length > config.maxSeries) {
    advise(
      `${form} has ${items.length} items; more than ${config.maxSeries} is hard to hold in mind`,
      {
        element: host,
        hint: 'Show the top few and roll the rest into "Other", or split across slides. An audience reads a slide once, at your pace, not theirs.',
      },
    );
  }

  const values = items.map((item) => item.number.value).filter(Number.isFinite);

  if (form === 'bar' && values.length && Math.abs(sum(values) - 100) < 0.5) {
    advise('these bars sum to 100 — this looks like a part-of-whole story', {
      element: host,
      hint: 'data-infograph="waffle" shows a share as a countable grid; bars show it as a ranking.',
    });
  }

  if (form === 'waffle' && values.length > 1) {
    advise('waffle shows one share of a whole, but several values were given', {
      element: host,
      hint: 'Use the first value as the share, or switch to data-infograph="bar" to compare them.',
    });
  }

  if (form === 'bar' && values.some((v) => v < 0) && values.some((v) => v > 0)) {
    advise('bar values cross zero', {
      element: host,
      hint: 'Length encodes magnitude from a baseline; mixed signs make the bars mean two different things. Consider splitting the figure.',
    });
  }
}

/** @param {number[]} ns */
function sum(ns) {
  return ns.reduce((a, b) => a + b, 0);
}

export const INTENTS = Object.keys(BY_INTENT);
