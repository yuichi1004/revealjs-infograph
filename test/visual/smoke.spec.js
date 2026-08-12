import { test, expect } from '@playwright/test';
import { CASES } from './cases.js';

/**
 * The fixture loads, renders every case, and finishes its fonts.
 *
 * Kept as its own spec so a broken harness (dev server, font loading, module
 * resolution inside the container) fails here with one clear message instead of
 * as forty confusing assertion failures in principles.spec.js.
 */
test('the fixture renders every case and settles', async ({ page }) => {
  await page.goto('/test/visual/fixtures/forms.html');
  await expect(page.locator('#cases')).toHaveAttribute('data-state', 'ready');

  const figures = page.locator('.case-stage .ig-figure');
  await expect(figures).toHaveCount(CASES.length);

  // If Inter did not load, every measurement and screenshot in the suite is
  // about some other font — worth its own assertion rather than a silent skew.
  const fontLoaded = await page.evaluate(() => document.fonts.check('16px "Inter Variable"'));
  expect(fontLoaded, 'Inter Variable must be loaded before anything is measured').toBe(true);
});
