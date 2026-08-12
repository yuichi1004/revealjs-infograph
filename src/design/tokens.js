/**
 * The few dimensions that have to exist in JavaScript.
 *
 * Almost all sizing lives in styles/infograph.css as custom properties, where a
 * host theme can override it. What cannot live there is geometry the renderer
 * has to *count* with: how many waffle cells to emit, what radius two circles
 * need for a given overlap. Those numbers are here.
 *
 * Anything that could be a CSS variable should be a CSS variable. Adding to
 * this file should feel slightly uncomfortable.
 */

/** @typedef {'comfortable'|'compact'} Density */

/**
 * Waffle geometry. Ten by ten because the whole point of the form is that a
 * reader can count a row without counting: 10×10 makes "37 of 100" legible by
 * reading three full rows plus seven, which is a subitising task rather than an
 * estimation one. Other grid sizes lose that.
 */
export const WAFFLE = {
  columns: 10,
  rows: 10,
  get total() {
    return this.columns * this.rows;
  },
};

/**
 * Venn geometry, in the SVG user units of a 480×260 viewBox — the same canvas
 * the reference deck drew its circles on by hand, so migrating a deck does not
 * shift the figure on screen.
 */
export const VENN = {
  width: 480,
  height: 260,
  radius: 90,
  centerY: 130,
};

/**
 * Cycle geometry, in SVG user units. Square, unlike venn's wide canvas, because
 * the shape is a ring rather than two circles side by side.
 *
 * `nodeRadius` and `labelRadius` are both counted from the same centre as the
 * ring itself: a node sits *on* the ring, its label sits further out along the
 * same angle. The gap between `radius` and `labelRadius` is what keeps a label
 * from overlapping the arc that passes behind it.
 */
export const CYCLE = {
  width: 340,
  height: 340,
  centerX: 170,
  centerY: 170,
  radius: 100,
  nodeRadius: 9,
  labelRadius: 128,
};

/**
 * @param {Density} density
 * @returns {number} Multiplier applied to spacing-derived geometry.
 */
export function densityScale(density) {
  return density === 'compact' ? 0.75 : 1;
}

/**
 * Distance between two circle centres that yields a given fractional overlap.
 *
 * Authors think in "how much do these two things share" (0 = separate, 1 =
 * identical), not in centre distance. Mapping linearly from that intent to
 * `d = 2r(1 - overlap)` is not the true area-proportional solution — that has
 * no closed form — but it is monotonic, hits both endpoints exactly, and reads
 * correctly. A Venn diagram on a slide is a rhetorical device, not a
 * measurement; pretending its areas are quantitative would be the bigger lie.
 *
 * @param {number} radius
 * @param {number} overlap 0–1
 */
export function centerDistance(radius, overlap) {
  const clamped = Math.max(0, Math.min(1, overlap));
  return 2 * radius * (1 - clamped);
}
