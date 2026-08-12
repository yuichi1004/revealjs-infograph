/**
 * The palette, and the thresholds it must keep meeting.
 *
 * These values started life as a comment at the top of a single deck's
 * theme.css — a hand-measured triad with its contrast ratios and CVD ΔE written
 * out in prose. Prose rots: the next deck copies the colours, tweaks one, and
 * the comment now describes a palette that no longer exists.
 *
 * So the measurements live here as executable thresholds instead.
 * test/palette.test.js runs every palette through them on every CI run, and
 * `npm run validate:palette` prints the same table for a human.
 *
 * Two colour roles, because they have genuinely different jobs:
 *
 *   marks  — fills for large shapes: bars, waffle cells, circles. Judged on
 *            *separation* from each other and from the surface. Never used for
 *            small text.
 *   inks   — the same hues darkened until they clear 4.5:1 on the surface, for
 *            when a label must carry the series colour.
 *
 * Every form in this package direct-labels its marks, so a mark colour only
 * ever has to be distinguishable, never readable. That is what buys the extra
 * chroma the mark colours have — and why aqua (2.74:1) is allowed to exist.
 */

import { contrastRatio, chroma, separation } from './contrast.js';

/**
 * @typedef {object} Palette
 * @property {string} name
 * @property {string} description
 * @property {string[]} marks      Fill colours, in assignment order.
 * @property {string[]} inks       Text-safe variant of each mark, same index.
 * @property {string} surface      The background these were measured against.
 * @property {string} muted        The "everything else" gray for de-emphasis.
 */

/** @type {Record<string, Palette>} */
export const PALETTES = {
  /*
   * The validated triad from the reference deck. Ordered blue → orange → aqua
   * because that is also their order of decreasing contrast: a chart using two
   * series gets the two strongest colours automatically.
   */
  default: {
    name: 'default',
    description: 'Blue / orange / aqua triad validated for light surfaces',
    marks: ['#2a78d6', '#eb6834', '#1baf7a'],
    inks: ['#1c5cab', '#b23f14', '#0d7a53'],
    surface: '#fcfcfb',
    muted: '#c9c8c2',
  },
};

/**
 * Thresholds. Chosen to match what the reference deck was already measured
 * against, so migrating an existing theme into this package is a no-op.
 */
export const THRESHOLDS = {
  /** Mark fills must stay clear of the surface, but need not be text-legible. */
  markContrastMin: 1.9,
  /** Ink variants carry small text: WCAG AA for normal-size text. */
  inkContrastMin: 4.5,
  /** Enough chroma that the fill reads as "a colour", not a tinted gray. */
  markChromaMin: 30,
  /** Distinguishable in normal vision. ΔE2000 ~10 is a comfortable margin. */
  markSeparationMin: 15,
  /** Distinguishable under protan/deutan/tritan too — the binding constraint. */
  cvdSeparationMin: 8,
};

/**
 * Resolve a palette by name, falling back to the default rather than throwing:
 * a typo in a deck's config should downgrade to sensible colours mid-talk, not
 * blank the slide.
 *
 * @param {string|Palette} [palette]
 * @returns {Palette}
 */
export function resolvePalette(palette) {
  if (palette && typeof palette === 'object') return palette;
  if (typeof palette === 'string' && PALETTES[palette]) return PALETTES[palette];
  return PALETTES.default;
}

/**
 * The CSS custom property a form should reference for series `index`.
 *
 * Forms emit `var(--ig-mark-1)` rather than a literal `#2a78d6` on purpose: the
 * host deck's stylesheet can then re-point the whole package at its own brand
 * colours by redefining three variables, and dark/light variants come for free
 * from the host's media query. The JS palette above only defines the *defaults*
 * those variables fall back to (see styles/infograph.css) and the thresholds
 * they are checked against.
 *
 * @param {number} index 0-based series index
 * @param {'mark'|'ink'} [role]
 */
export function seriesVar(index, role = 'mark') {
  const slot = (index % 3) + 1;
  return `var(--ig-${role}-${slot})`;
}

/**
 * Audit a palette against THRESHOLDS.
 *
 * Shared by the test and the CLI script so a failing CI run and a local
 * `npm run validate:palette` can never disagree about what is wrong.
 *
 * @param {Palette} palette
 * @returns {{ pass: boolean, checks: Array<{ label: string, metric: string, value: number, min: number, pass: boolean }> }}
 */
export function auditPalette(palette) {
  const checks = [];

  palette.marks.forEach((mark, i) => {
    checks.push({
      label: `mark ${i + 1} ${mark}`,
      metric: 'contrast vs surface',
      value: contrastRatio(mark, palette.surface),
      min: THRESHOLDS.markContrastMin,
      pass: contrastRatio(mark, palette.surface) >= THRESHOLDS.markContrastMin,
    });
    checks.push({
      label: `mark ${i + 1} ${mark}`,
      metric: 'chroma',
      value: chroma(mark),
      min: THRESHOLDS.markChromaMin,
      pass: chroma(mark) >= THRESHOLDS.markChromaMin,
    });
  });

  palette.inks.forEach((ink, i) => {
    const ratio = contrastRatio(ink, palette.surface);
    checks.push({
      label: `ink ${i + 1} ${ink}`,
      metric: 'contrast vs surface',
      value: ratio,
      min: THRESHOLDS.inkContrastMin,
      pass: ratio >= THRESHOLDS.inkContrastMin,
    });
  });

  // All pairs, not just adjacent ones: a reader comparing the first and third
  // series is doing the same discrimination task as one comparing neighbours.
  for (let i = 0; i < palette.marks.length; i++) {
    for (let j = i + 1; j < palette.marks.length; j++) {
      const sep = separation(palette.marks[i], palette.marks[j]);
      checks.push({
        label: `marks ${i + 1}↔${j + 1}`,
        metric: 'ΔE2000 normal vision',
        value: sep.normal,
        min: THRESHOLDS.markSeparationMin,
        pass: sep.normal >= THRESHOLDS.markSeparationMin,
      });
      checks.push({
        label: `marks ${i + 1}↔${j + 1}`,
        metric: 'ΔE2000 worst CVD',
        value: Math.min(sep.protan, sep.deutan, sep.tritan),
        min: THRESHOLDS.cvdSeparationMin,
        pass: Math.min(sep.protan, sep.deutan, sep.tritan) >= THRESHOLDS.cvdSeparationMin,
      });
    }
  }

  return { pass: checks.every((c) => c.pass), checks };
}
