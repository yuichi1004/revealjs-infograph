/**
 * Golden images — the safety net under the assertions, not the main event.
 *
 * principles.spec.js catches the things this package has committed to. This
 * catches everything else: a font-size that drifts, a gap that doubles, a
 * border that disappears. Nobody wrote a rule about those, so nothing else
 * would notice.
 *
 * Shots are per **figure**, not per slide. A slide-level baseline goes red when
 * anything on the slide moves, so the diff tells you a page changed and leaves
 * you to work out which part. A figure-level baseline names the form in the
 * filename, so a red build points at one renderer. The two deck-level shots at
 * the end are the exception, and exist to catch the composition problems a
 * cropped figure cannot show.
 *
 * Baselines are environment-specific — see scripts/visual-docker.sh. Regenerate
 * with `npm run test:visual:update`, never with a bare `--update-snapshots` on
 * the host.
 */

import { test, expect } from '@playwright/test';
import { CASES } from './cases.js';
import { openFixture, DECK_URL } from './helpers.js';

test.describe('forms', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  for (const { id, note } of CASES) {
    test(`${id} looks the way it did`, async ({ page }) => {
      // The stage, not the figure: its border gives the shot a fixed frame, so
      // a figure that changes size produces a diff rather than a differently
      // cropped image that happens to match.
      const stage = page.locator(`[data-stage="${id}"]`);
      await stage.scrollIntoViewIfNeeded();

      // Carries the case's note into the HTML report, so a failing shot arrives
      // with a sentence about what it was meant to be protecting.
      test.info().annotations.push({ type: 'covers', description: note });

      await expect(stage).toHaveScreenshot(`${id}.png`);
    });
  }
});

test.describe('the deck', () => {
  test('a figure inside a slide, at reveal’s own scale', async ({ page }) => {
    await page.goto(DECK_URL);
    await page.waitForSelector('.reveal.ready');
    await page.evaluate(() => document.fonts.ready);

    // The waffle slide: the form with the most parts, so composition problems
    // (gutters, alignment against the slide's own type) show up here first.
    const index = await page.evaluate(() => {
      const slides = [...document.querySelectorAll('.reveal .slides > section')];
      return slides.findIndex((s) => s.querySelector('[data-infograph="waffle"]'));
    });
    expect(index).toBeGreaterThan(-1);

    await page.evaluate((i) => window.deck.slide(i), index);
    // Past the entrance animation: this baseline is of the settled figure,
    // which is also what `animations: 'disabled'` would land on.
    await page.waitForTimeout(1200);

    await expect(page.locator('section.present')).toHaveScreenshot('deck-waffle-slide.png');
  });

  test('a flow with every fragment revealed', async ({ page }) => {
    await page.goto(DECK_URL);
    await page.waitForSelector('.reveal.ready');
    await page.evaluate(() => document.fonts.ready);

    const index = await page.evaluate(() => {
      const slides = [...document.querySelectorAll('.reveal .slides > section')];
      return slides.findIndex((s) => s.querySelector('[data-ig-fragment="steps"]'));
    });
    expect(index).toBeGreaterThan(-1);

    await page.evaluate((i) => window.deck.slide(i), index);
    // Reveal all three steps. The fully-built state is the one an audience ends
    // up looking at for longest, so it is the one worth pinning.
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1200);

    await expect(page.locator('section.present')).toHaveScreenshot('deck-flow-revealed.png');
  });
});
