/**
 * Silhouettes for pictogram marks — ISOTYPE, not decoration.
 *
 * `waffle` and `bar` can draw their marks as a repeated silhouette instead of a
 * block. The rule that makes this legitimate rather than ornamental is Otto
 * Neurath's, and it is not negotiable here:
 *
 *   **A sign is repeated, never enlarged.**
 *
 * Scaling one big symbol to encode a quantity turns the reading task into an
 * area judgement — fourth or fifth in Cleveland & McGill's accuracy ranking, and
 * the single most common way a pictorial chart misleads. Repeating identical
 * symbols leaves the task as counting (waffle) and length (bar), which is what
 * those two forms already claim to be. So this module only ever produces one
 * fixed-size glyph, and the forms only ever repeat it. There is deliberately no
 * way to ask for a proportionally-filled silhouette.
 *
 * On the evidence that this costs nothing: Haroz, Kosara & Franconeri, "ISOTYPE
 * Visualization: Working Memory, Performance, and Engagement with Pictographs"
 * (CHI 2015) found repeated pictographs did not hurt reading accuracy, and did
 * help recall and engagement.
 *
 * Every path is authored here rather than lifted from an icon set, so the
 * package keeps its "zero dependencies, MIT, no attribution" promise. The set is
 * deliberately small: eight shapes that stay legible at a waffle cell's size
 * (~12px), plus `data-ig-symbol-path` for anything domain-specific. Eight
 * good silhouettes beat thirty that turn to mush at 12px.
 */

import { advise } from '../warn.js';

/**
 * @typedef {object} Symbol
 * @property {string} path     A single `d`, possibly with several subpaths.
 * @property {string} viewBox  Always square — see below.
 */

/**
 * The viewBox every built-in uses.
 *
 * Square, and that is load-bearing rather than tidy. The glyph is centred inside
 * a square slot, which is how an ISOTYPE grid aligns, and it is what keeps the
 * waffle's cells provably square (`principles.spec.js` asserts width == height
 * within 0.6px). A tall glyph on a tall viewBox would quietly turn the grid into
 * something you can no longer count in rows.
 */
export const VIEWBOX = '0 0 24 24';

/** @type {Record<string, Symbol>} */
export const SYMBOLS = {
  // The default mark, available by name so a figure can opt back out of a
  // deck-wide `infograph: { symbol: 'person' }`.
  square: {
    path: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    viewBox: VIEWBOX,
  },

  circle: { path: 'M12 2.6a9.4 9.4 0 0 1 0 18.8 9.4 9.4 0 0 1 0-18.8z', viewBox: VIEWBOX },

  // Head and shoulders. The one that carries most ISOTYPE charts, so it gets the
  // most generous proportions: a large head reads as a person far longer, as the
  // glyph shrinks, than an anatomically sensible one does.
  person: {
    path: 'M12 2.6a3.9 3.9 0 0 1 0 7.8 3.9 3.9 0 0 1 0-7.8zM12 11.6c-4.2 0-7.6 3-7.6 6.8v3h15.2v-3c0-3.8-3.4-6.8-7.6-6.8z',
    viewBox: VIEWBOX,
  },

  building: {
    path: 'M4 21.4V6.2c0-.4.3-.8.8-.8h5.4c.4 0 .8.4.8.8v3.4h7.2c.4 0 .8.4.8.8v11H4z',
    viewBox: VIEWBOX,
  },

  // Canopy and trunk as two subpaths — simpler to read at small sizes than a
  // conifer's serrations, which alias into a grey triangle below about 16px.
  tree: {
    path: 'M12 2.4a6.3 6.3 0 0 1 0 12.6 6.3 6.3 0 0 1 0-12.6zM10.6 14.4h2.8v7.2h-2.8z',
    viewBox: VIEWBOX,
  },

  drop: {
    path: 'M12 2.2c-3.7 4.4-6.5 7.9-6.5 11.2a6.5 6.5 0 0 0 13 0c0-3.3-2.8-6.8-6.5-11.2z',
    viewBox: VIEWBOX,
  },

  heart: {
    path: 'M12 21.2c-.4 0-.8-.15-1.1-.43C6.2 16.6 2.9 13.7 2.9 9.9 2.9 7 5.1 4.8 7.9 4.8c1.6 0 3.1.75 4.1 1.95 1-1.2 2.5-1.95 4.1-1.95 2.8 0 5 2.2 5 5.1 0 3.8-3.3 6.7-8 10.87-.3.28-.7.43-1.1.43z',
    viewBox: VIEWBOX,
  },

  star: {
    path: 'M12 2.2l3 6.05 6.7.97-4.85 4.72 1.15 6.66L12 17.45l-6 3.15 1.15-6.66L2.3 9.22l6.7-.97L12 2.2z',
    viewBox: VIEWBOX,
  },
};

/** Names of the built-in silhouettes. */
export function symbolNames() {
  return Object.keys(SYMBOLS);
}

/**
 * The symbol a figure asked for, or `null` to keep plain blocks.
 *
 * A custom path wins over a name, so a deck can set `symbol: 'person'` deck-wide
 * and still hand one figure its own glyph. An unknown name advises and falls
 * back to blocks rather than throwing — same contract as the rest of this
 * package: a talk with a plain-looking chart beats a talk with a blank slide.
 *
 * @param {string|null|undefined} name
 * @param {string|null|undefined} customPath
 * @param {Element} [host]  For the advisory message.
 * @returns {Symbol|null}
 */
export function resolveSymbol(name, customPath, host) {
  if (customPath) return { path: customPath, viewBox: VIEWBOX };
  if (!name) return null;

  const found = SYMBOLS[name];
  if (found) return found;

  advise(`unknown symbol "${name}"`, {
    element: host,
    hint: `Built-in symbols: ${symbolNames().join(', ')}. For anything else, pass the outline directly with data-ig-symbol-path (a path drawn on a 24×24 grid).`,
  });
  return null;
}

/**
 * A symbol as a CSS `url()`, ready for `mask-image`.
 *
 * Inlined as a data URI rather than fetched: forms are synchronous and return a
 * detached node (see src/forms/index.js), and a mark that pops in one network
 * round-trip after the slide would break the "resting state is the finished
 * state" guarantee the whole package rests on.
 *
 * `encodeURIComponent` escapes `"`, `<`, `>` and `#`, which is exactly the set
 * that would otherwise terminate the quoted `url()` early — so an author's own
 * `data-ig-symbol-path` cannot break out of the property, however it is written.
 *
 * @param {Symbol} symbol
 * @returns {string}
 */
export function symbolUrl(symbol) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.viewBox}">` +
    `<path d="${symbol.path}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
