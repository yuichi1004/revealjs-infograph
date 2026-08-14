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
 *
 * A second block below adds process/priority shapes for `data-icon` (see
 * src/icon.js) — flow steps, pyramid tiers, cycle stages, quadrant cells. Those
 * render at ~24-32px, never at a waffle cell's ~12px, so the "eight beats
 * thirty at 12px" ceiling above does not apply to them; they get more detail
 * (holes, multiple subpaths) than the mark set affords. Both blocks share one
 * registry and one name→shape lookup: `data-ig-symbol="gear"` and
 * `data-icon="gear"` resolve the same entry, because the shape is the same
 * asset either way — only what the caller does with it (repeat it as a mark,
 * or place it once as a name) differs.
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

  // ---- process/priority icons, for data-icon — see the module doc above ----

  // A checkmark hexagon: a short inner stroke down to the valley, then a long
  // outer stroke back up. Two straight strokes given width, same construction
  // every tick mark in every icon set uses, because there is no other way to
  // draw one.
  check: {
    path: 'M4 12L6 10 10 14 18 6 20 8 10 18z',
    viewBox: VIEWBOX,
  },

  // Pole as a plain bar, pennant as a notched rectangle (the notch is what
  // reads as cloth rather than a flat rectangle-on-a-stick).
  flag: {
    path: 'M5 2h1.6v20H5zM7.6 3h9.8l-2.6 3.4 2.6 3.4H7.6z',
    viewBox: VIEWBOX,
  },

  // A ring (outer disc, inner disc wound the opposite way so it punches a
  // hole) with two hand-shaped bars sitting in the hollow centre. The hands
  // are a second positive subpath layered back into the hole, not a colour
  // change — a mask only ever has one colour, so "inside the hollow" is the
  // only way to place them.
  clock: {
    path:
      'M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18z' +
      'M12 5.6a6.4 6.4 0 0 0 0 12.8 6.4 6.4 0 0 0 0-12.8z' +
      'M11.3 7.5h1.4v4.5h-1.4z' +
      'M12 11.3h5v1.4h-5z',
    viewBox: VIEWBOX,
  },

  // A bullseye: three concentric circles, alternating winding direction so a
  // ring, a gap, then a centre dot fall out of the same nonzero fill rule the
  // clock's hole uses.
  target: {
    path:
      'M12 3a9 9 0 0 1 0 18 9 9 0 0 1 0-18z' +
      'M12 6a6 6 0 0 0 0 12 6 6 0 0 0 0-12z' +
      'M12 9a3 3 0 0 1 0 6 3 3 0 0 1 0-6z',
    viewBox: VIEWBOX,
  },

  // The caution triangle, with the exclamation mark cut out of it: a bar and
  // a dot, each wound against the triangle so the same nonzero fill rule that
  // hollows clock, target and gear drops them out. Bare, the triangle does not
  // privilege the caution reading — a solid triangle cues "play", "delta" or
  // "up" just as readily — so the bang is load-bearing, not detailing. Both
  // cutouts are rectangles, which is why no bezier work is involved: reversing
  // the point order is the whole of it.
  alert: {
    path: 'M12 2.5L21.5 20.5 2.5 20.5z' + 'M10.6 8.4v5.8h2.8v-5.8z' + 'M10.6 15.9v2.8h2.8v-2.8z',
    viewBox: VIEWBOX,
  },

  // Bulb as a circle, base as two stacked bars — the same
  // wide-shape-then-narrow-shape construction `person` already uses for head
  // and shoulders.
  lightbulb: {
    path: 'M12 3a6 6 0 0 1 0 12 6 6 0 0 1 0-12zM9.5 15h5v2.5h-5zM10 18h4v2h-4z',
    viewBox: VIEWBOX,
  },

  // A cog: a ring (same hole trick as clock and target) with eight square
  // teeth at 45° increments, each seated *into* the ring rather than floating
  // clear of it. Detached teeth were the shipped bug, and not only at small
  // sizes — a ring of separated squares is a sun at every size, because
  // detached marks around a disc are what rays are. Seating them costs
  // nothing: an axis tooth bites 0.7 into the ring and a diagonal one 1.7 (a
  // square meets a diagonal radius corner-first, so it needs the extra to
  // overlap at all), and both still end 8.2 from the centre — closer to a
  // circular silhouette than the detached version managed.
  gear: {
    path:
      'M12 5.5a6.5 6.5 0 0 1 0 13 6.5 6.5 0 0 1 0-13z' +
      'M12 9.5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 0 0-5z' +
      'M17.8 10.8h2.4v2.4h-2.4z' +
      'M15.4 15.4h2.4v2.4h-2.4z' +
      'M10.8 17.8h2.4v2.4h-2.4z' +
      'M6.2 15.4h2.4v2.4h-2.4z' +
      'M3.8 10.8h2.4v2.4h-2.4z' +
      'M6.2 6.2h2.4v2.4h-2.4z' +
      'M10.8 3.8h2.4v2.4h-2.4z' +
      'M15.4 6.2h2.4v2.4h-2.4z',
    viewBox: VIEWBOX,
  },

  // A page with a folded corner (one six-point outline, the diagonal cut
  // standing in for the fold) plus three text-line bars, shortest one nearest
  // the fold so it never crosses into the cut corner. The bars are wound
  // against the page so they punch through it. Drawn the same way round they
  // would sit inside a shape that is already solid — and a mask has only one
  // colour, so "on top of the page" is not a thing this can render.
  document: {
    path:
      'M6 2h8l6 6v14H6z' +
      'M8.5 8v1.4h5v-1.4z' +
      'M8.5 12v1.4h9v-1.4z' +
      'M8.5 16v1.4h9v-1.4z',
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
