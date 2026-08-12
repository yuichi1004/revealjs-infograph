/**
 * Node-side glue between the browser probes and the package's own measurement
 * code.
 *
 * The pattern throughout the suite: the page reports what it painted, this file
 * turns that into a judgement using `src/design/contrast.js` — the same
 * functions `npm run validate:palette` and `test/palette.test.js` use. A colour
 * that passes the palette test but fails on screen fails here with the same
 * units, which is the point.
 */

import { expect } from '@playwright/test';
import { contrastRatio, parseCssColor, flatten } from '../../src/design/contrast.js';
import { textColorsOf } from './probes.js';

/** Where the fixture lives, relative to the configured baseURL. */
export const FIXTURE_URL = '/test/visual/fixtures/forms.html';

/** Where the real deck lives. */
export const DECK_URL = '/examples/index.html';

/**
 * Open the fixture and wait until it is safe to measure.
 * @param {import('@playwright/test').Page} page
 */
export async function openFixture(page) {
  await page.goto(FIXTURE_URL);
  await expect(page.locator('#cases')).toHaveAttribute('data-state', 'ready');
}

/** The stage wrapper for one case, and the figure inside it. */
export const stage = (/** @type {string} */ id) => `[data-stage="${id}"]`;
export const figureIn = (/** @type {string} */ id) => `${stage(id)} .ig-figure`;

/**
 * Flatten a reported background stack into one opaque colour.
 *
 * `textColorsOf` walks up the DOM collecting layers from nearest to furthest,
 * so compositing runs back-to-front: start at the last (opaque) layer and paint
 * each nearer one over it.
 *
 * @param {string[]} layers
 * @returns {[number, number, number]}
 */
export function flattenLayers(layers) {
  const parsed = layers.map(parseCssColor);
  let backdrop = parsed[parsed.length - 1].rgb;
  for (let i = parsed.length - 2; i >= 0; i--) backdrop = flatten(parsed[i], backdrop);
  return backdrop;
}

/**
 * The WCAG floor that applies to a given piece of text.
 *
 * 3:1 for large text is not a loophole — larger glyphs have thicker strokes and
 * stay legible at lower contrast, which is why the standard draws the line
 * there. "Large" is ≥24px, or ≥18.66px when bold.
 *
 * @param {{ fontSize: number, fontWeight: number }} text
 */
export function contrastFloor({ fontSize, fontWeight }) {
  const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
  return large ? 3 : 4.5;
}

/**
 * Measure every visible text element under `selector` and score its contrast.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<Array<{ selector: string, text: string, ratio: number, floor: number,
 *                           fontSize: number, fontWeight: number }>>}
 */
export async function measureContrast(page, selector) {
  const samples = await page.evaluate(textColorsOf, [selector]);

  return samples.map((sample) => {
    const backdrop = flattenLayers(sample.layers);
    // `opacity` on an ancestor fades the text toward whatever is behind it, so
    // it is folded into the foreground before scoring. Without this a figure
    // caught mid-animation would score as if fully painted.
    const foreground = flatten(
      { ...parseCssColor(sample.color), alpha: parseCssColor(sample.color).alpha * sample.opacity },
      backdrop,
    );

    return {
      selector: sample.selector,
      text: sample.text,
      ratio: contrastRatio(foreground, backdrop),
      floor: contrastFloor(sample),
      fontSize: sample.fontSize,
      fontWeight: sample.fontWeight,
    };
  });
}

/**
 * Format a list of failures so the assertion message names them.
 *
 * Playwright prints the expected/received of the assertion, not the array that
 * produced it, so anything the reader needs has to be in the message itself.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} describe
 */
export function listing(items, describe) {
  return items.map((item) => `\n  - ${describe(item)}`).join('');
}
