/**
 * Author-facing advice.
 *
 * The cognitive-load rules this package encodes (series count, one emphasis,
 * direct labelling) are *defaults*, not laws — a deck author with a reason can
 * override any of them. What they should not get is silence: an eight-series
 * bar chart should say, once, at authoring time, that nobody in the audience
 * will hold eight categories in working memory.
 *
 * So: warn, never throw, never alter the output. And warn once per message, or
 * a deck with fifteen figures drowns its own console.
 */

/** @type {Set<string>} */
const seen = new Set();

let enabled = true;

/**
 * Silence advice for a deck: `infograph: { quiet: true }`.
 * @param {boolean} value
 */
export function setQuiet(value) {
  enabled = !value;
}

/** Test hook — the "once" cache would otherwise leak across test cases. */
export function resetWarnings() {
  seen.clear();
  enabled = true;
}

/**
 * @param {string} message What is wrong, in the author's terms.
 * @param {object} [context]
 * @param {Element} [context.element] The authored element, for devtools.
 * @param {string} [context.hint] What to do instead.
 */
export function advise(message, context = {}) {
  if (!enabled) return;

  const key = message + (context.hint ?? '');
  if (seen.has(key)) return;
  seen.add(key);

  const parts = [`[infograph] ${message}`];
  if (context.hint) parts.push(`\n  → ${context.hint}`);

  // console.warn rather than an exception: a figure that breaks a guideline
  // still renders, because a talk in ten minutes beats a perfect chart.
  console.warn(parts.join(''), context.element ?? '');
}
