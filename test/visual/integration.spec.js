/**
 * The parts that only exist inside a real deck.
 *
 * principles.spec.js runs the figures on a bare page, where a rectangle is a
 * rectangle. reveal.js changes that: it scales the whole canvas with a CSS
 * transform, drives the animation lifecycle from slide events, hides slides it
 * is not showing, and re-lays-out everything again for print. None of that is
 * observable without it, and all of it has broken figures before.
 *
 * So this file asks only the questions the fixture cannot:
 *
 *   - is a figure complete when nothing animated it (print, reduced motion)?
 *   - does a fragment-gated figure wait, and then arrive?
 *   - does auto-animate produce real numbers for an SVG-bearing figure?
 *   - does a figure stay inside the slide once reveal has scaled it?
 */

import { test, expect } from '@playwright/test';
import { DECK_URL, measureContrast, listing } from './helpers.js';
import { stylesOf, rectsOf } from './probes.js';

/**
 * Open the playground deck and wait for reveal to finish its first layout.
 * @param {import('@playwright/test').Page} page
 * @param {string} [query]
 */
async function openDeck(page, query = '') {
  await page.goto(`${DECK_URL}${query}`);
  await page.waitForSelector('.reveal.ready');
  // reveal writes its scale transform on the next frame after `ready`; measuring
  // before that reports the unscaled layout.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  await page.evaluate(() => document.fonts.ready);
}

test.describe('the deck renders every figure', () => {
  test('every authored figure on every slide is rendered at ready', async ({ page }) => {
    await openDeck(page);

    // Rendering is deliberately eager — see the comment at the top of
    // src/plugin.js. If it ever becomes lazy, auto-animate breaks silently, so
    // this is the assertion that pins the decision.
    const authored = await page.locator('[data-infograph]').count();
    const rendered = await page.locator('[data-ig-rendered]').count();
    expect(rendered).toBe(authored);
    expect(rendered).toBeGreaterThan(5);
  });

  test('figures on slides that were never visited are rendered too', async ({ page }) => {
    await openDeck(page);
    const lastSlide = page.locator('.reveal .slides > section').last();
    // `.present` is never set on it, yet its content must exist for print and
    // overview to work.
    await expect(lastSlide).not.toHaveClass(/present/);
    expect(await page.locator('.reveal .slides > section:last-child').count()).toBe(1);
  });
});

test.describe('principle 2 in a real deck: the examples don’t trip their own advice', () => {
  test('loading the deck logs no [infograph] console warning', async ({ page }) => {
    // Every figure this package ships gets rendered eagerly on load (see the
    // test above), so this is the whole surface a stray advisory could come
    // from. A fixture-level count (principles.spec.js's bar-track loop) can't
    // see this: it measures geometry on isolated cases, not what actually logs
    // when the real, bundled deck comes up — which is what let a five-tier
    // pyramid trip a warning meant for bar on every single load.
    const warnings = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().startsWith('[infograph]')) {
        warnings.push(msg.text());
      }
    });

    await openDeck(page);

    expect(warnings, `the deck logged:${listing(warnings, (w) => w)}`).toEqual([]);
  });
});

test.describe('principle 10 in a real deck: the resting state is the finished state', () => {
  test('print view shows every figure fully painted', async ({ page }) => {
    // The one that matters most. A figure that depends on an entrance animation
    // having run exports as a blank space, and nobody notices until the PDF is
    // already sent.
    await openDeck(page, '?print-pdf');
    await page.emulateMedia({ media: 'print' });

    const figures = await page.evaluate(stylesOf, [
      '.reveal',
      '.ig-figure',
      ['opacity', 'visibility'],
    ]);
    expect(figures.length).toBeGreaterThan(5);

    const invisible = figures.filter((f) => Number(f.opacity) < 1 || f.visibility !== 'visible');
    expect(
      invisible,
      `figures not fully painted in print view:${listing(
        invisible,
        (f) => `opacity ${f.opacity}, visibility ${f.visibility}`,
      )}`,
    ).toEqual([]);
  });

  test('marks keep their geometry in print view', async ({ page }) => {
    await openDeck(page, '?print-pdf');
    await page.emulateMedia({ media: 'print' });

    // A bar animated with scaleX would print at zero width if the keyframe
    // never ran. Width is the property that would collapse, so check it.
    const fills = await page.evaluate(rectsOf, ['.reveal', '.ig-bar-fill']);
    expect(fills.length).toBeGreaterThan(0);
    expect(
      fills.every((f) => f.width > 0),
      'bar fills must have width in print',
    ).toBe(true);

    const cells = await page.evaluate(rectsOf, ['.reveal', '.ig-waffle-cell-on']);
    expect(
      cells.every((c) => c.width > 1),
      'waffle cells must be sized in print',
    ).toBe(true);
  });
});

test.describe('fragments', () => {
  test('a fragment-gated flow waits, then animates when revealed', async ({ page }) => {
    await openDeck(page);

    // Jump to the flow slide by its content rather than by index, so inserting
    // a slide into the playground does not silently retarget this test.
    const flowSlide = page.locator('section:has([data-ig-fragment="steps"])');
    await expect(flowSlide).toHaveCount(1);

    const index = await flowSlide.evaluate((el) => {
      const slides = [...document.querySelectorAll('.reveal .slides > section')];
      return slides.indexOf(/** @type {HTMLElement} */ (el));
    });
    await page.evaluate((i) => window.deck.slide(i), index);
    await page.waitForTimeout(200);

    const steps = flowSlide.locator('.ig-flow-step.fragment');
    await expect(steps).toHaveCount(3);

    // Not yet revealed: the figure must not have spent its entrance on content
    // the audience cannot see.
    await expect(steps.first()).not.toHaveClass(/visible/);

    await page.keyboard.press('ArrowRight');
    await expect(steps.first()).toHaveClass(/visible/);

    // …and once revealed it settles at the resting state, which is the finished
    // state. The animation is additive, so the end of it is where the figure
    // already was.
    await page.waitForTimeout(900);
    const [step] = await page.evaluate(stylesOf, [
      'section:has([data-ig-fragment="steps"])',
      '.ig-flow-step.visible',
      ['opacity'],
    ]);
    expect(Number(step.opacity)).toBeGreaterThan(0.9);
  });
});

test.describe('auto-animate', () => {
  test('an SVG-bearing figure morphs with real numbers, not NaN', async ({ page }) => {
    await openDeck(page);

    // The trap this pins: with `center: false` reveal measures auto-animate
    // pairs via offsetLeft/offsetWidth, which do not exist on SVG elements —
    // producing translate(NaNpx, NaNpx) and killing the animation silently.
    // examples/main.js documents leaving `center` alone for exactly this reason.
    const pair = page.locator('section[data-auto-animate]:has([data-id="thesis"])');
    await expect(pair).toHaveCount(2);

    const first = await pair.first().evaluate((el) => {
      const slides = [...document.querySelectorAll('.reveal .slides > section')];
      return slides.indexOf(/** @type {HTMLElement} */ (el));
    });

    await page.evaluate((i) => window.deck.slide(i), first);
    await page.waitForTimeout(300);
    await page.evaluate((i) => window.deck.slide(i), first + 1);
    // Sampled mid-flight: a NaN transform is written at the start of the
    // animation and would be gone by the time it settled.
    await page.waitForTimeout(120);

    const transforms = await page.evaluate(() =>
      [...document.querySelectorAll('.present [data-id], .present .ig-figure')].map(
        (el) => getComputedStyle(el).transform,
      ),
    );

    const broken = transforms.filter((t) => t.includes('NaN'));
    expect(broken, `NaN in auto-animate transforms: ${broken.join(', ')}`).toEqual([]);
  });
});

test.describe('layout under reveal’s scale transform', () => {
  test('no figure escapes its slide', async ({ page }) => {
    await openDeck(page);

    const escapes = await page.evaluate(() => {
      const out = [];
      for (const section of document.querySelectorAll('.reveal .slides > section')) {
        const slide = section.getBoundingClientRect();
        for (const figure of section.querySelectorAll('.ig-figure')) {
          const box = figure.getBoundingClientRect();
          if (box.width === 0) continue; // a slide reveal has not laid out yet
          if (box.left < slide.left - 1 || box.right > slide.right + 1) {
            out.push({
              form: /** @type {HTMLElement} */ (figure).dataset.igForm ?? '?',
              overflow: Math.round(Math.max(slide.left - box.left, box.right - slide.right)),
            });
          }
        }
      }
      return out;
    });

    expect(
      escapes,
      `figures wider than their slide:${listing(escapes, (e) => `${e.form} by ${e.overflow}px`)}`,
    ).toEqual([]);
  });

  test('contrast holds against the deck’s own theme, not just the defaults', async ({ page }) => {
    await openDeck(page);

    // examples/theme.css defines --c-blue and friends, so the figures on this
    // page are running on *host* tokens resolved through the fallback chain.
    // The palette unit test cannot see this path at all: it measures the
    // package's constants, and these are the deck's.
    const samples = await measureContrast(page, '.reveal .slides section.present');
    expect(samples.length).toBeGreaterThan(0);

    const failures = samples.filter((s) => s.ratio < s.floor);
    expect(
      failures,
      `contrast below the WCAG floor with the deck theme applied:${listing(
        failures,
        (f) => `${f.selector} "${f.text}" — ${f.ratio.toFixed(2)}:1 (needs ${f.floor}:1)`,
      )}`,
    ).toEqual([]);
  });
});
