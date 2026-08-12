/**
 * Colour measurement — the arithmetic behind every claim this package makes
 * about its palette.
 *
 * Two questions get asked of a palette, and they are not the same question:
 *
 *   1. Can you *read* it?      → WCAG contrast ratio against the surface.
 *   2. Can you *tell it apart* → CIEDE2000 between marks, measured both in
 *      from its neighbours?      normal vision and under simulated colour
 *                                vision deficiency (protan / deutan / tritan).
 *
 * A palette that passes (1) and fails (2) produces charts that are perfectly
 * legible and completely unreadable: every series is crisp, and roughly 8% of
 * men cannot tell which series is which. Both floors are asserted in CI by
 * test/palette.test.js.
 *
 * No dependencies — the whole chain (sRGB → linear → XYZ → Lab → ΔE2000, plus
 * the LMS-space CVD simulation) is ~150 lines and pinning it here means the
 * numbers in the palette comments can never drift away from what is measured.
 */

/** @typedef {[number, number, number]} RGB 0–255 per channel. */

/**
 * @param {string} hex `#rgb` or `#rrggbb`
 * @returns {RGB}
 */
export function parseHex(hex) {
  const s = hex.trim().replace(/^#/, '');
  const full = s.length === 3 ? [...s].map((c) => c + c).join('') : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** @param {RGB} rgb */
export function toHex(rgb) {
  return '#' + rgb.map((c) => clamp255(c).toString(16).padStart(2, '0')).join('');
}

/**
 * Read any colour a browser hands back from `getComputedStyle`.
 *
 * The visual suite measures contrast on what was *actually painted*, which
 * means feeding real computed values into the same functions the palette test
 * uses — and computed values are never hex. Chromium returns legacy
 * `rgb(22, 32, 44)` / `rgba(22, 32, 44, 0.5)`, but the modern space-separated
 * form `rgb(22 32 44 / 50%)` is also valid and shows up for some inputs, so
 * both are accepted.
 *
 * Alpha comes back separately rather than being pre-multiplied: a translucent
 * colour has no luminance of its own, only a luminance once you know what is
 * behind it. Compositing is `flatten()`'s job, and keeping them apart is what
 * stops "black text at 50% opacity" from being scored as if it were black.
 *
 * @param {string} value
 * @returns {{ rgb: RGB, alpha: number }}
 */
export function parseCssColor(value) {
  const text = value.trim().toLowerCase();

  if (text === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  if (text.startsWith('#')) return { rgb: parseHex(text), alpha: 1 };

  const match = text.match(/^rgba?\(([^)]+)\)$/);
  if (!match) throw new Error(`unsupported CSS colour: ${value}`);

  // Legacy syntax separates with commas, modern with spaces and a slash before
  // alpha. Normalising both to one list first keeps the parsing in one place.
  const parts = match[1]
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) throw new Error(`unsupported CSS colour: ${value}`);

  const channel = (/** @type {string} */ raw) =>
    raw.endsWith('%') ? (parseFloat(raw) / 100) * 255 : parseFloat(raw);

  const alpha = parts[3] === undefined ? 1 : channelAlpha(parts[3]);

  return {
    rgb: [channel(parts[0]), channel(parts[1]), channel(parts[2])],
    alpha,
  };
}

/** @param {string} raw */
function channelAlpha(raw) {
  const n = raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

/**
 * Composite a translucent colour over an opaque backdrop.
 *
 * Needed because "the effective background of this label" is often not one
 * colour but a stack — a semi-transparent fill over a card over the page. WCAG
 * contrast is only defined for opaque pairs, so the stack has to be flattened
 * before it can be scored.
 *
 * @param {{ rgb: RGB, alpha: number }} colour
 * @param {RGB} backdrop
 * @returns {RGB}
 */
export function flatten(colour, backdrop) {
  const a = colour.alpha;
  return /** @type {RGB} */ (colour.rgb.map((c, i) => c * a + backdrop[i] * (1 - a)));
}

/**
 * Accept a hex string, a CSS colour string, or an RGB triple.
 * @param {string|RGB} colour
 * @returns {RGB}
 */
function toRgb(colour) {
  if (typeof colour !== 'string') return colour;
  return colour.startsWith('#') ? parseHex(colour) : parseCssColor(colour).rgb;
}

/** @param {number} c */
function clamp255(c) {
  return Math.max(0, Math.min(255, Math.round(c)));
}

/**
 * sRGB companding: gamma-encoded 0–255 → linear-light 0–1.
 * @param {number} channel
 */
function toLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Inverse companding: linear-light 0–1 → gamma-encoded 0–255.
 * @param {number} c
 */
function fromLinear(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v * 255;
}

/**
 * WCAG 2.x relative luminance.
 * @param {string|RGB} colour
 */
export function luminance(colour) {
  const [r, g, b] = toRgb(colour);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * WCAG 2.x contrast ratio, 1–21. Order of arguments does not matter.
 * @param {string|RGB} a
 * @param {string|RGB} b
 */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---------- CIELAB ---------- */

// D65 white point, 2° observer.
const WHITE = [0.95047, 1.0, 1.08883];

/**
 * @param {string|RGB} colour
 * @returns {[number, number, number]} L*, a*, b*
 */
export function toLab(colour) {
  const [r, g, b] = toRgb(colour);
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];

  // sRGB → XYZ (D65)
  const xyz = [
    rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175,
    rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041,
  ];

  const f = xyz.map((v, i) => {
    const t = v / WHITE[i];
    return t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
  });

  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

/**
 * Chroma in the a*b* plane — how far a colour is from gray.
 * @param {string|RGB} colour
 */
export function chroma(colour) {
  const [, a, b] = toLab(colour);
  return Math.hypot(a, b);
}

/**
 * CIEDE2000 colour difference.
 *
 * The 1976 formula (plain euclidean distance in Lab) badly overstates
 * differences in the blue region and understates them for near-neutrals, which
 * is exactly where a categorical palette lives. ΔE2000's hue-rotation and
 * chroma-weighting terms are worth the extra 30 lines here.
 *
 * @param {string|RGB} a
 * @param {string|RGB} b
 */
export function deltaE(a, b) {
  const [L1, a1, b1] = toLab(a);
  const [L2, a2, b2] = toLab(b);

  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const h1p = hueAngle(b1, a1p);
  const h2p = hueAngle(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp += h1p + h2p < 360 ? 360 : -360;
    hbarp /= 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * rad) +
    0.24 * Math.cos(2 * hbarp * rad) +
    0.32 * Math.cos((3 * hbarp + 6) * rad) -
    0.2 * Math.cos((4 * hbarp - 63) * rad);

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh),
  );

  /** @param {number} b @param {number} ap */
  function hueAngle(b, ap) {
    if (ap === 0 && b === 0) return 0;
    const h = Math.atan2(b, ap) * deg;
    return h >= 0 ? h : h + 360;
  }
}

/* ---------- Colour vision deficiency ---------- */

/**
 * Brettel/Viénot-style dichromat simulation in LMS space (Viénot 1999 single-
 * plane approximation, the same model used by Color Oracle and friends).
 *
 * These matrices are the whole reason `--c-aqua` in the reference deck ships
 * with a visible label: run the blue/aqua pair through `deutan` and the ΔE
 * collapses far below what it looks like in normal vision.
 */
const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
];

const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
];

/** @type {Record<string, number[][]>} */
const CVD_MATRICES = {
  protan: [
    [0, 1.05118294, -0.05116099],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deutan: [
    [1, 0, 0],
    [0.9513092, 0, 0.04866992],
    [0, 0, 1],
  ],
  tritan: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.86744736, 1.86727089, 0],
  ],
};

export const CVD_TYPES = /** @type {const} */ (['protan', 'deutan', 'tritan']);

/** @param {number[][]} m @param {number[]} v */
function apply(m, v) {
  return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

/**
 * Simulate how `colour` appears to a dichromat.
 * @param {string|RGB} colour
 * @param {'protan'|'deutan'|'tritan'} type
 * @returns {string} hex
 */
export function simulateCvd(colour, type) {
  const matrix = CVD_MATRICES[type];
  if (!matrix) throw new Error(`unknown CVD type: ${type}`);

  const linear = toRgb(colour).map(toLinear);
  const lms = apply(RGB_TO_LMS, linear);
  const simulated = apply(matrix, lms);
  const back = apply(LMS_TO_RGB, simulated);
  return toHex(/** @type {RGB} */ (back.map(fromLinear)));
}

/**
 * The worst-case perceptual distance between two colours across normal vision
 * and all three dichromacies — the number that actually decides whether a
 * palette pair is safe.
 *
 * @param {string} a
 * @param {string} b
 * @returns {{ worst: number, normal: number, protan: number, deutan: number, tritan: number }}
 */
export function separation(a, b) {
  /** @type {Record<string, number>} */
  const out = { normal: deltaE(a, b) };
  for (const type of CVD_TYPES) {
    out[type] = deltaE(simulateCvd(a, type), simulateCvd(b, type));
  }
  out.worst = Math.min(...Object.values(out));
  return /** @type {any} */ (out);
}
