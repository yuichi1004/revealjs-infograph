/**
 * The principles in docs/principles.md, asserted against what a browser
 * actually painted.
 *
 * This is the file the visual work exists for. The unit suite proves the DOM is
 * shaped correctly; happy-dom computes no layout, so it cannot tell whether the
 * bars share a baseline, whether a label landed next to its mark, or whether
 * the venn lens was ever drawn. Change one line of CSS and all 145 unit tests
 * stay green while the figure stops meaning what it claims.
 *
 * Deliberately not screenshots. A golden image says "something changed" and
 * leaves the diagnosis to whoever opens the diff. These say
 * "principle 1: bar left edges differ by 14.5px" — which is both the failure and
 * the explanation. Screenshots cover what an assertion cannot anticipate; they
 * live in screenshots.spec.js.
 *
 * Test titles carry the principle number so a failure points straight at the
 * section of docs/principles.md it violates.
 */

import { test, expect } from '@playwright/test';
import { VENN, centerDistance, CYCLE } from '../../src/design/tokens.js';
import { CASES, caseById } from './cases.js';
import { openFixture, stage, figureIn, measureContrast, listing } from './helpers.js';
import {
  rectsOf,
  stylesOf,
  elementAtFraction,
  overflowingIn,
  textCollisionsIn,
  decorationIn,
  masksOf,
} from './probes.js';

test.beforeEach(async ({ page }) => {
  await openFixture(page);
});

/**
 * Where the venn renderer puts things, in viewBox units, for a given overlap.
 *
 * Derived from the same `VENN` tokens and `centerDistance()` the form uses
 * (src/design/tokens.js) rather than from hand-measured fractions. A sample
 * point written as "0.36 across" is a magic number that silently stops probing
 * what it was aimed at the moment the canvas or the radius changes; this stays
 * aimed at the same feature of the drawing.
 *
 * @param {number} overlap
 */
function geometry(overlap) {
  const distance = centerDistance(VENN.radius, overlap);
  const cxA = VENN.width / 2 - distance / 2;
  const cxB = VENN.width / 2 + distance / 2;
  return {
    circleA: { centre: cxA, left: cxA - VENN.radius, right: cxA + VENN.radius },
    circleB: { centre: cxB, left: cxB - VENN.radius, right: cxB + VENN.radius },
    // The lens spans from B's left edge to A's right edge — that is what an
    // intersection of two equal circles is.
    lens: { left: cxB - VENN.radius, right: cxA + VENN.radius },
  };
}

/**
 * A viewBox x coordinate as a fraction of the canvas width.
 * @param {number} x
 */
function fractionOf(x) {
  return x / VENN.width;
}

/* ------------------------------------------------------------------ *
 * Principle 1 — position and length beat area and colour
 * ------------------------------------------------------------------ */

test.describe('principle 1: length on a common baseline', () => {
  // bar-symbol is in this list on purpose. Swapping a continuous fill for a row
  // of glyphs is only defensible if length still means magnitude, so it faces
  // exactly the same two assertions as the plain bars, unrelaxed.
  for (const id of ['bar-plain', 'bar-emphasis', 'bar-long-labels', 'bar-symbol']) {
    test(`${id}: every bar starts at the same x`, async ({ page }) => {
      const fills = await page.evaluate(rectsOf, [stage(id), '.ig-bar-fill']);
      expect(fills.length).toBeGreaterThan(1);

      const lefts = fills.map((r) => r.left);
      const spread = Math.max(...lefts) - Math.min(...lefts);

      // The claim "length encodes magnitude" is only true if the lengths are
      // measured from the same origin. A ragged start turns a length comparison
      // back into the estimation task the form exists to avoid.
      expect(
        spread,
        `bar left edges span ${spread.toFixed(2)}px: ${lefts.join(', ')}`,
      ).toBeLessThan(1);
    });

    test(`${id}: bar lengths are proportional to their values`, async ({ page }) => {
      const { values } = caseById(id);
      const fills = await page.evaluate(rectsOf, [stage(id), '.ig-bar-fill']);
      expect(fills).toHaveLength(/** @type {number[]} */ (values).length);

      const max = Math.max(.../** @type {number[]} */ (values));
      const widest = Math.max(...fills.map((r) => r.width));

      const errors = fills
        .map((rect, i) => {
          const expected = /** @type {number[]} */ (values[i] / max) * widest;
          return { i, expected, actual: rect.width, error: Math.abs(rect.width - expected) };
        })
        .filter((e) => e.error > 1);

      expect(
        errors,
        `bar widths do not match their values:${listing(
          errors,
          (e) =>
            `bar ${e.i + 1}: expected ${e.expected.toFixed(1)}px, got ${e.actual.toFixed(1)}px`,
        )}`,
      ).toEqual([]);
    });
  }

  test('bar tracks all share one right edge, so the scale is common', async ({ page }) => {
    // Bars are only comparable if they are drawn against the same available
    // width; a per-row track width would silently rescale each bar.
    const tracks = await page.evaluate(rectsOf, [stage('bar-plain'), '.ig-bar-track']);
    const rights = tracks.map((r) => r.right);
    expect(Math.max(...rights) - Math.min(...rights)).toBeLessThan(1);
  });
});

/* ------------------------------------------------------------------ *
 * Principle 2 — working memory holds about four chunks
 * ------------------------------------------------------------------ */

test.describe('principle 2: working memory', () => {
  test('no built-in case exceeds the default series ceiling', async ({ page }) => {
    // The package advises past four series. Its own examples should not need
    // the advice — a suite that ships figures it warns about is not credible.
    for (const id of ['bar-plain', 'bar-emphasis', 'bar-long-labels', 'bar-symbol']) {
      const tracks = await page.evaluate(rectsOf, [stage(id), '.ig-bar-track']);
      expect(tracks.length, `${id} draws ${tracks.length} series`).toBeLessThanOrEqual(4);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Principle 3 — direct labelling, because a legend splits attention
 * ------------------------------------------------------------------ */

test.describe('principle 3: direct labelling', () => {
  test('bar labels sit beside their own bar, not in a legend', async ({ page }) => {
    const names = await page.evaluate(rectsOf, [stage('bar-plain'), '.ig-bar-name']);
    // Measured against the track rather than the row: `.ig-bar-row` is
    // `display: contents` so it has no box of its own (see styles/infograph.css).
    const tracks = await page.evaluate(rectsOf, [stage('bar-plain'), '.ig-bar-track']);
    expect(names).toHaveLength(tracks.length);

    const strays = names
      .map((name, i) => ({
        i,
        // Vertical centres must coincide: that is what makes the pairing
        // pre-attentive rather than something the reader works out.
        offset: Math.abs((name.top + name.bottom) / 2 - (tracks[i].top + tracks[i].bottom) / 2),
      }))
      .filter((n) => n.offset > 2);

    expect(
      strays,
      `labels are not vertically centred on their row:${listing(
        strays,
        (s) => `row ${s.i + 1}: off by ${s.offset.toFixed(1)}px`,
      )}`,
    ).toEqual([]);
  });

  test('each venn label stays over its own circle and on its own side', async ({ page }) => {
    for (const id of ['venn-narrow', 'venn-wide']) {
      const [circleA] = await page.evaluate(rectsOf, [stage(id), '.ig-venn-circle-a']);
      const [circleB] = await page.evaluate(rectsOf, [stage(id), '.ig-venn-circle-b']);
      const [labelA] = await page.evaluate(rectsOf, [stage(id), '.ig-venn-label-a']);
      const [labelB] = await page.evaluate(rectsOf, [stage(id), '.ig-venn-label-b']);

      const centre = (/** @type {{left:number,right:number}} */ r) => (r.left + r.right) / 2;
      const midline = (centre(circleA) + centre(circleB)) / 2;

      // The labels are anchored at their circle's centre pointing outward, not
      // centred on it (see styles/infograph.css — centring made them collide at
      // high overlap). So the association to check is "unambiguously on this
      // circle's side", not "exactly on its axis".
      expect(centre(labelA), `${id}: label A must sit left of the midline`).toBeLessThan(midline);
      expect(centre(labelB), `${id}: label B must sit right of the midline`).toBeGreaterThan(
        midline,
      );

      // …and still be over the circle it names, rather than off in the margin.
      expect(labelA.right, `${id}: label A must reach its circle`).toBeGreaterThan(circleA.left);
      expect(labelB.left, `${id}: label B must reach its circle`).toBeLessThan(circleB.right);
    }
  });

  test('venn labels move when the geometry does', async ({ page }) => {
    const at = async (/** @type {string} */ id, /** @type {string} */ sel) =>
      (await page.evaluate(rectsOf, [stage(id), sel]))[0];

    const narrowA = await at('venn-narrow', '.ig-venn-label-a');
    const wideA = await at('venn-wide', '.ig-venn-label-a');

    // At overlap 0.55 the circles are much closer together, so label A must
    // have moved right. A label pinned to a fixed position would pass every
    // other check in this file and still be wrong.
    expect(wideA.left).toBeGreaterThan(narrowA.left + 10);
  });

  test('no figure emits a detached legend', async ({ page }) => {
    const legends = await page.locator('#cases [class*="legend"]').all();
    for (const legend of legends) {
      // The waffle's value + label block is called a legend in the markup but
      // is direct labelling: it must touch the grid it describes.
      const box = await legend.boundingBox();
      const grid = await legend.locator('xpath=..').locator('.ig-waffle-grid').boundingBox();
      if (!box || !grid) continue;
      const gap = box.y - (grid.y + grid.height);
      expect(gap, 'a legend must sit against its marks, not away from them').toBeLessThan(40);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Principle 4 — signalling: exactly one thing stands out
 * ------------------------------------------------------------------ */

test.describe('principle 4: signalling', () => {
  test('without emphasis every bar is the same colour', async ({ page }) => {
    const fills = await page.evaluate(stylesOf, [
      stage('bar-plain'),
      '.ig-bar-fill',
      ['background-color'],
    ]);
    const colours = new Set(fills.map((f) => f['background-color']));
    expect(colours.size, `expected one fill colour, got ${[...colours].join(', ')}`).toBe(1);
  });

  test('with emphasis exactly one bar keeps the mark colour', async ({ page }) => {
    const { emphasis } = caseById('bar-emphasis');
    const fills = await page.evaluate(stylesOf, [
      stage('bar-emphasis'),
      '.ig-bar-fill',
      ['background-color'],
    ]);

    const highlighted = fills[/** @type {number} */ (emphasis) - 1]['background-color'];
    const rest = fills.filter((_, i) => i !== /** @type {number} */ (emphasis) - 1);

    expect(rest.map((f) => f['background-color'])).not.toContain(highlighted);
    // Two highlights is the same as none: the eye has nowhere to land.
    expect(new Set(rest.map((f) => f['background-color'])).size).toBe(1);
  });

  test('emphasis is carried by contrast, not by learning a colour', async ({ page }) => {
    const plain = await page.evaluate(stylesOf, [
      stage('bar-plain'),
      '.ig-bar-fill',
      ['background-color'],
    ]);
    const emphasised = await page.evaluate(stylesOf, [
      stage('bar-emphasis'),
      '.ig-bar-fill',
      ['background-color'],
    ]);

    // The emphasised bar keeps the colour every bar had when nothing was
    // emphasised; the others drop away. The reader is not asked to learn that
    // "this new hue means important".
    const { emphasis } = caseById('bar-emphasis');
    expect(emphasised[/** @type {number} */ (emphasis) - 1]['background-color']).toBe(
      plain[0]['background-color'],
    );
  });
});

/* ------------------------------------------------------------------ *
 * Principle 5 — no decoration
 * ------------------------------------------------------------------ */

test.describe('principle 5: no decoration', () => {
  for (const { id } of CASES) {
    test(`${id} paints no gradients, glows or drop shadows`, async ({ page }) => {
      const found = await page.evaluate(decorationIn, [figureIn(id)]);
      expect(
        found,
        `decoration found:${listing(found, (d) => `${d.selector} ${d.property}: ${d.value}`)}`,
      ).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------ *
 * Principle 7 — sequence has to be stated, not implied by adjacency
 * ------------------------------------------------------------------ */

test.describe('principle 7: explicit connectors', () => {
  test('an arrow sits in every gap between steps, and none at the ends', async ({ page }) => {
    const steps = await page.evaluate(rectsOf, [stage('flow'), '.ig-flow-step']);
    const arrows = await page.evaluate(rectsOf, [stage('flow'), '.ig-flow-arrow']);

    expect(arrows).toHaveLength(steps.length - 1);

    arrows.forEach((arrow, i) => {
      const before = steps[i];
      const after = steps[i + 1];
      const centre = (arrow.left + arrow.right) / 2;
      // Boxes in a row read as a group, not a sequence. The arrow is the only
      // thing asserting direction, so it has to be between the two things it
      // relates — not floating near them.
      expect(centre, `arrow ${i + 1} is not between its steps`).toBeGreaterThanOrEqual(
        before.right - 1,
      );
      expect(centre).toBeLessThanOrEqual(after.left + 1);
    });
  });

  test('steps share a baseline so the sequence reads as one row', async ({ page }) => {
    const steps = await page.evaluate(rectsOf, [stage('flow'), '.ig-flow-step']);
    const tops = steps.map((s) => s.top);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
  });
});

/* ------------------------------------------------------------------ *
 * Principle 9 — readable, and distinguishable
 * ------------------------------------------------------------------ */

test.describe('principle 9: contrast as painted', () => {
  for (const { id } of CASES) {
    test(`${id}: every visible label clears its WCAG floor`, async ({ page }) => {
      const samples = await measureContrast(page, figureIn(id));
      expect(samples.length, 'nothing measurable — did the figure render?').toBeGreaterThan(0);

      const failures = samples.filter((s) => s.ratio < s.floor);

      // This is the check the palette unit test cannot make. That one measures
      // the constants; this one measures what the cascade actually resolved to
      // on screen, including the host page's background and any inherited
      // opacity. A token that is correct in isolation and wrong in context
      // fails here.
      expect(
        failures,
        `contrast below the WCAG floor:${listing(
          failures,
          (f) =>
            `${f.selector} "${f.text}" — ${f.ratio.toFixed(2)}:1 ` +
            `(needs ${f.floor}:1 at ${f.fontSize}px/${f.fontWeight})`,
        )}`,
      ).toEqual([]);
    });
  }

  test('mark colours are never used for text', async ({ page }) => {
    // --ig-mark-3 is 2.74:1 on the surface. It is allowed to exist because
    // every form direct-labels its marks, so it only ever fills a shape. The
    // venn intersection label is the place that rule is easiest to break.
    const samples = await measureContrast(page, figureIn('venn-wide'));
    const intersection = samples.find((s) => s.selector.includes('ig-venn-label-ab'));
    expect(intersection, 'the intersection label should exist').toBeTruthy();
    expect(
      /** @type {{ratio:number}} */ (intersection).ratio,
      'the intersection label must use --ig-ink-3, not the mark colour',
    ).toBeGreaterThanOrEqual(4.5);
  });
});

/* ------------------------------------------------------------------ *
 * Principle 10 — the resting state is the finished state
 * ------------------------------------------------------------------ */

test.describe('principle 10: resting state is finished state', () => {
  test('figures are fully painted with no animation class present', async ({ page }) => {
    // The fixture never adds .ig-enter — there is no reveal deck driving it.
    // So this measures the state a figure is in when nothing runs at all:
    // no JS lifecycle, no slide events. It must already be complete.
    const enters = await page.locator('#cases .ig-enter').count();
    expect(enters, 'the fixture should not be animating anything').toBe(0);

    for (const { id } of CASES) {
      const [figure] = await page.evaluate(stylesOf, [
        stage(id),
        '.ig-figure',
        ['opacity', 'transform', 'visibility'],
      ]);
      expect(Number(figure.opacity), `${id} opacity`).toBe(1);
      expect(figure.visibility, `${id} visibility`).toBe('visible');
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)'], `${id} transform`).toContain(figure.transform);
    }
  });

  test('marks have their final geometry without any animation', async ({ page }) => {
    // A waffle whose cells only reach full size at the end of a keyframe would
    // print as a grid of dots. Cells must be square at rest.
    const cells = await page.evaluate(rectsOf, [stage('waffle'), '.ig-waffle-cell']);
    expect(cells).toHaveLength(100);
    for (const cell of cells) {
      expect(Math.abs(cell.width - cell.height), 'waffle cells must be square').toBeLessThan(0.6);
      expect(cell.width).toBeGreaterThan(4);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Principle 11 — the geometry is the claim
 * ------------------------------------------------------------------ */

test.describe('principle 11: geometry says what the markup says', () => {
  test('the venn lens is the real intersection, not a third circle', async ({ page }) => {
    for (const id of ['venn-narrow', 'venn-wide']) {
      const centre = await page.evaluate(elementAtFraction, [
        `${stage(id)} .ig-venn-svg`,
        0.5,
        0.5,
      ]);
      expect(
        centre?.classes,
        `${id}: the point where the circles overlap must paint the lens`,
      ).toContain('ig-venn-circle-ab');
    }
  });

  test('outside the overlap, each circle paints alone', async ({ page }) => {
    // Deep inside circle A but well short of the lens. If the lens were an
    // unclipped circle floated on top it would spread past the intersection and
    // could turn up here.
    const inA = fractionOf(geometry(0.05).circleA.left + VENN.radius * 0.4);
    const left = await page.evaluate(elementAtFraction, [
      `${stage('venn-narrow')} .ig-venn-svg`,
      inA,
      0.5,
    ]);
    expect(left?.classes).toContain('ig-venn-circle-a');
    expect(left?.classes).not.toContain('ig-venn-circle-ab');
  });

  test('a wider overlap paints a wider lens', async ({ page }) => {
    // One x, chosen to fall inside the wide lens and outside the narrow one.
    // Midway between the two lenses' left edges, so it has margin on both
    // sides — and derived from the same tokens the renderer uses, so it stays
    // correct if the canvas is ever resized.
    const fx = fractionOf((geometry(0.05).lens.left + geometry(0.55).lens.left) / 2);

    const narrow = await page.evaluate(elementAtFraction, [
      `${stage('venn-narrow')} .ig-venn-svg`,
      fx,
      0.5,
    ]);
    const wide = await page.evaluate(elementAtFraction, [
      `${stage('venn-wide')} .ig-venn-svg`,
      fx,
      0.5,
    ]);

    // This is the check that catches data-overlap being ignored entirely: both
    // figures would then paint the same thing at the same point.
    expect(narrow?.classes, 'the narrow lens must not reach this far out').not.toContain(
      'ig-venn-circle-ab',
    );
    expect(wide?.classes, 'the wide lens must reach here').toContain('ig-venn-circle-ab');
  });

  test('the waffle is a countable 10-column grid', async ({ page }) => {
    const cells = await page.evaluate(rectsOf, [stage('waffle'), '.ig-waffle-cell']);
    expect(cells).toHaveLength(100);

    // Ten distinct x positions and ten distinct y positions. The form's whole
    // claim — that a share can be read by counting rows — depends on it.
    const columns = new Set(cells.map((c) => Math.round(c.left)));
    const rows = new Set(cells.map((c) => Math.round(c.top)));
    expect(columns.size, 'expected 10 columns').toBe(10);
    expect(rows.size, 'expected 10 rows').toBe(10);
  });

  test('filled waffle cells are contiguous from the start', async ({ page }) => {
    const filled = await page.evaluate(
      ([root]) => {
        const grid = document.querySelector(`${root} .ig-waffle-grid`);
        return [...(grid?.children ?? [])].map((c) => c.classList.contains('ig-waffle-cell-on'));
      },
      [stage('waffle')],
    );

    // 43.8% rounds to 44 cells, and they must be the first 44: a scattered fill
    // cannot be counted, which is the only reason to prefer this to a pie.
    const on = filled.filter(Boolean).length;
    expect(on).toBe(44);
    expect(filled.slice(0, on).every(Boolean), 'filled cells must be contiguous').toBe(true);
    expect(filled.slice(on).some(Boolean), 'no filled cells after the run').toBe(false);
  });

  test('compare shows both sides at the same size, so neither is favoured', async ({ page }) => {
    const values = await page.evaluate(stylesOf, [
      stage('compare'),
      '.ig-compare-value',
      ['font-size'],
    ]);
    expect(values).toHaveLength(2);
    expect(values[0]['font-size']).toBe(values[1]['font-size']);
  });
});

/* ------------------------------------------------------------------ *
 * ISOTYPE — a sign is repeated, never enlarged
 * ------------------------------------------------------------------ */

test.describe('pictogram marks', () => {
  test('the waffle stays a countable 10×10 grid of square cells', async ({ page }) => {
    // The entire justification for pictogram marks is that nothing about the
    // encoding changes. If a glyph made the cells non-square or knocked the
    // grid out of alignment, "count the rows" would stop being true and the
    // symbols would have cost precision to buy decoration.
    const cells = await page.evaluate(rectsOf, [stage('waffle-symbol'), '.ig-waffle-cell']);
    expect(cells).toHaveLength(100);

    for (const cell of cells) {
      expect(Math.abs(cell.width - cell.height), 'cells must stay square').toBeLessThan(0.6);
      expect(cell.width).toBeGreaterThan(4);
    }

    expect(new Set(cells.map((c) => Math.round(c.left))).size, 'columns').toBe(10);
    expect(new Set(cells.map((c) => Math.round(c.top))).size, 'rows').toBe(10);
  });

  test('the same 44 cells are filled, still contiguous', async ({ page }) => {
    const filled = await page.evaluate(
      ([root]) => {
        const grid = document.querySelector(`${root} .ig-waffle-grid`);
        return [...(grid?.children ?? [])].map((c) => c.classList.contains('ig-waffle-cell-on'));
      },
      [stage('waffle-symbol')],
    );

    const on = filled.filter(Boolean).length;
    expect(on).toBe(44);
    expect(filled.slice(0, on).every(Boolean)).toBe(true);
  });

  test('the marks are really painted as glyphs, not just told to be', async ({ page }) => {
    // Reads the computed value, so this fails if `--ig-symbol` never resolved.
    // That is not hypothetical: the `--ig-*` tokens were once scoped to
    // `.reveal` and silently resolved to nothing outside a deck.
    const masks = await page.evaluate(masksOf, [stage('waffle-symbol'), '.ig-waffle-cell']);
    expect(masks).toHaveLength(100);
    expect(
      masks.filter((m) => !m.masked).length,
      `cells without a resolved symbol mask (first: ${masks.find((m) => !m.masked)?.value})`,
    ).toBe(0);
  });

  test('a bar draws one glyph per unit, so the count is the value', async ({ page }) => {
    // data-ig-symbol-unit="10" against 34 / 52 / 71 — that is 3, 5 and 7 whole
    // glyphs, each with a partial after it.
    const perRow = await page.evaluate(
      ([root]) => {
        const fills = document.querySelectorAll(`${root} .ig-bar-fill`);
        return [...fills].map((fill) => ({
          whole: fill.querySelectorAll(':scope > .ig-bar-glyph').length,
          partial: fill.querySelectorAll(':scope > .ig-bar-glyph-partial').length,
        }));
      },
      [stage('bar-symbol')],
    );

    expect(perRow).toEqual([
      { whole: 3, partial: 1 },
      { whole: 5, partial: 1 },
      { whole: 7, partial: 1 },
    ]);
  });

  test('a partial glyph is a clipped whole one, never a smaller one', async ({ page }) => {
    // The ISOTYPE rule this whole feature is built on. A scaled-down glyph would
    // say "a smaller thing"; a clipped one says "less of them".
    const [whole] = await page.evaluate(rectsOf, [
      `${stage('bar-symbol')} .ig-bar-fill`,
      ':scope > .ig-bar-glyph',
    ]);
    const [clipper] = await page.evaluate(rectsOf, [
      `${stage('bar-symbol')} .ig-bar-fill`,
      ':scope > .ig-bar-glyph-partial',
    ]);
    const [inner] = await page.evaluate(rectsOf, [
      `${stage('bar-symbol')} .ig-bar-glyph-partial`,
      '.ig-bar-glyph',
    ]);

    // 34 with a unit of 10 leaves 0.4 of a symbol.
    expect(clipper.width / whole.width).toBeCloseTo(0.4, 1);
    // …but the glyph inside is full size and merely cut off.
    expect(inner.width).toBeCloseTo(whole.width, 1);
    expect(inner.height).toBeCloseTo(whole.height, 1);
  });

  test('every glyph carrying a value is the same size', async ({ page }) => {
    // One symbol must equal one unit everywhere, or counting them means nothing.
    // Scoped to the bars: the key's glyph is deliberately text-sized, because it
    // states the scale rather than carrying a value.
    const glyphs = await page.evaluate(rectsOf, [
      `${stage('bar-symbol')} .ig-bar`,
      '.ig-bar-fill .ig-bar-glyph',
    ]);
    expect(glyphs.length).toBeGreaterThan(10);

    const widths = glyphs.map((g) => g.width);
    const heights = glyphs.map((g) => g.height);
    expect(Math.max(...widths) - Math.min(...widths), 'glyph widths').toBeLessThan(0.6);
    expect(Math.max(...heights) - Math.min(...heights), 'glyph heights').toBeLessThan(0.6);
  });

  test('the bar states what one glyph is worth', async ({ page }) => {
    // An ISOTYPE chart whose unit is unstated cannot be read at all.
    const unit = page.locator(`${stage('bar-symbol')} .ig-bar-unit`);
    await expect(unit).toHaveCount(1);
    await expect(unit).toContainText('10');
  });
});

/* ------------------------------------------------------------------ *
 * pyramid — width states rank, not magnitude
 * ------------------------------------------------------------------ */

/**
 * Where a tier's slanted edge crosses the row's vertical mid-line, as a
 * fraction (0–1) of the row's own width.
 *
 * Mirrors the formula in src/forms/pyramid.js exactly — this is the same
 * "derive the sample point from the tokens the renderer uses" discipline the
 * venn tests above follow, so the test targets the same feature of the
 * drawing even if the tier count or the box size changes.
 *
 * @param {number} tier   0-based, 0 = apex.
 * @param {number} total  Tier count.
 */
function pyramidEdgeFraction(tier, total) {
  const topLeftPct = 50 - (50 * tier) / total;
  const bottomLeftPct = 50 - (50 * (tier + 1)) / total;
  return (topLeftPct + bottomLeftPct) / 2 / 100;
}

test.describe('pyramid: width states rank, not magnitude', () => {
  const TOTAL = 5; // Maslow's five levels — see test/visual/cases.js.

  test('every tier is really painted at the width the formula predicts', async ({ page }) => {
    // Hit-testing, not a bounding-box measurement: getBoundingClientRect() is
    // unaffected by clip-path, so every band reports the same full-width box
    // regardless of what is actually painted. Only sampling what is *under
    // the cursor* — the same technique the venn lens tests use — can tell a
    // real trapezoid from a rectangle that merely claims to be one.
    for (let tier = 0; tier < TOTAL; tier++) {
      const selector = `${stage('pyramid')} .ig-pyramid-row:nth-child(${tier + 1}) .ig-pyramid-band`;
      const edge = pyramidEdgeFraction(tier, TOTAL);

      const inside = await page.evaluate(elementAtFraction, [selector, edge + 0.03, 0.5]);
      const outside = await page.evaluate(elementAtFraction, [selector, edge - 0.03, 0.5]);

      expect(inside?.classes, `tier ${tier}: just inside the slope must be painted`).toContain(
        'ig-pyramid-band',
      );
      expect(
        outside?.classes,
        `tier ${tier}: just outside the slope must not be painted`,
      ).not.toContain('ig-pyramid-band');
    }
  });

  test('tiers narrow monotonically from base to apex', async ({ page }) => {
    // The predicted edges themselves move outward from apex to base by
    // construction; what needs checking is that the *painted* pyramid agrees,
    // tier by tier, all the way down. A CSS regression that reordered rows or
    // recomputed the polygon backwards would flip this without necessarily
    // breaking the single-tier check above.
    for (let tier = 1; tier < TOTAL; tier++) {
      const wider = `${stage('pyramid')} .ig-pyramid-row:nth-child(${tier + 1}) .ig-pyramid-band`;
      const narrower = `${stage('pyramid')} .ig-pyramid-row:nth-child(${tier}) .ig-pyramid-band`;
      const midpoint =
        (pyramidEdgeFraction(tier - 1, TOTAL) + pyramidEdgeFraction(tier, TOTAL)) / 2;

      // A point between the two tiers' edges: painted on the wider (lower)
      // tier, not painted on the narrower (upper) one.
      const onWider = await page.evaluate(elementAtFraction, [wider, midpoint, 0.5]);
      const onNarrower = await page.evaluate(elementAtFraction, [narrower, midpoint, 0.5]);

      expect(onWider?.classes, `tier ${tier} vs ${tier - 1}`).toContain('ig-pyramid-band');
      expect(onNarrower?.classes, `tier ${tier - 1} vs ${tier}`).not.toContain('ig-pyramid-band');
    }
  });

  test('every tier shares the same box, so only the clip narrows it', async ({ page }) => {
    // The design's whole simplification: one grid column width for every row,
    // with the trapezoid coming entirely from the clip. If a tier's box were
    // sized differently, the shared left edge bar already relies on would be
    // broken here too.
    const bands = await page.evaluate(rectsOf, [stage('pyramid'), '.ig-pyramid-band']);
    expect(bands).toHaveLength(TOTAL);

    const lefts = bands.map((b) => b.left);
    const widths = bands.map((b) => b.width);
    expect(Math.max(...lefts) - Math.min(...lefts), 'left edges').toBeLessThan(0.6);
    expect(Math.max(...widths) - Math.min(...widths), 'widths').toBeLessThan(0.6);
  });

  test('each label sits at its own tier’s vertical centre', async ({ page }) => {
    // Same shape of check as bar's "labels sit beside their own bar" —
    // principle 3, direct labelling, applied to a different geometry.
    const bands = await page.evaluate(rectsOf, [stage('pyramid'), '.ig-pyramid-band']);
    const labels = await page.evaluate(rectsOf, [stage('pyramid'), '.ig-pyramid-label']);
    expect(labels).toHaveLength(bands.length);

    const strays = labels
      .map((label, i) => ({
        i,
        offset: Math.abs((label.top + label.bottom) / 2 - (bands[i].top + bands[i].bottom) / 2),
      }))
      .filter((s) => s.offset > 2);

    expect(
      strays,
      `labels are not centred on their tier:${listing(
        strays,
        (s) => `tier ${s.i}: off by ${s.offset.toFixed(1)}px`,
      )}`,
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * cycle — a closed loop, drawn as real arcs
 * ------------------------------------------------------------------ */

/**
 * Where cycle puts a stage, mirroring src/forms/cycle.js's own formula
 * exactly — 0° at the top, increasing clockwise.
 * @param {number} i
 * @param {number} n
 */
function cycleAngle(i, n) {
  return -90 + i * (360 / n);
}

/**
 * A point on the ring, in CYCLE's own SVG user units.
 * @param {number} deg
 * @param {number} radius
 */
function cyclePoint(deg, radius) {
  const rad = (deg * Math.PI) / 180;
  return [CYCLE.centerX + radius * Math.cos(rad), CYCLE.centerY + radius * Math.sin(rad)];
}

/**
 * A CYCLE user-unit coordinate as a fraction (0–1) of the whole canvas, for
 * sampling against the full `.ig-cycle-svg` element.
 * @param {number} x
 * @param {number} y
 */
function cycleFraction(x, y) {
  return [x / CYCLE.width, y / CYCLE.height];
}

test.describe('cycle: a closed loop, drawn as real arcs', () => {
  const N = 4; // PDCA — see test/visual/cases.js.

  test('nodes sit on a real circle, ordered clockwise from the top', async ({ page }) => {
    const nodes = await page.evaluate(rectsOf, [stage('cycle'), '.ig-cycle-node']);
    expect(nodes).toHaveLength(N);

    const centre = (r) => [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
    const cx = nodes.reduce((s, n) => s + centre(n)[0], 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + centre(n)[1], 0) / nodes.length;

    const distances = nodes.map((n) => {
      const [x, y] = centre(n);
      return Math.hypot(x - cx, y - cy);
    });
    expect(
      Math.max(...distances) - Math.min(...distances),
      'nodes must be equidistant from the centre',
    ).toBeLessThan(1);

    // Angle from the centre, shifted so the top is 0 and increasing values
    // move clockwise — the same convention src/forms/cycle.js computes with.
    const angles = nodes.map((n) => {
      const [x, y] = centre(n);
      const raw = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
      return ((raw + 90) % 360) + (raw < -90 ? 360 : 0);
    });

    expect(angles[0], 'the first stage sits at the top').toBeLessThan(2);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i], `stage ${i} vs stage ${i - 1}`).toBeGreaterThan(angles[i - 1]);
    }
  });

  test('a closed loop draws one arc per stage, not one fewer', async ({ page }) => {
    // Unlike flow's open sequence (n - 1 connectors), the loop closes: the
    // last stage's arc points back to the first.
    const nodes = await page.evaluate(rectsOf, [stage('cycle'), '.ig-cycle-node']);
    const arrows = await page.evaluate(rectsOf, [stage('cycle'), '.ig-cycle-arrow']);
    expect(arrows).toHaveLength(nodes.length);
  });

  test('every connector is a real arc, not a straight chord', async ({ page }) => {
    // The exact question the arcs-vs-chords design decision comes down to:
    // sample the point where a true arc bows out to, and the point a straight
    // line between the same two nodes would pass through instead. A regular
    // polygon of straight connectors would paint the second point and miss
    // the first; a real arc does the opposite.
    for (let i = 0; i < N; i++) {
      const start = cycleAngle(i, N);
      const step = 360 / N;
      const mid = start + step / 2;

      const [arcX, arcY] = cyclePoint(mid, CYCLE.radius);
      const [nodeIx, nodeIy] = cyclePoint(start, CYCLE.radius);
      const [nodeJx, nodeJy] = cyclePoint(start + step, CYCLE.radius);
      const chordX = (nodeIx + nodeJx) / 2;
      const chordY = (nodeIy + nodeJy) / 2;

      const [arcFx, arcFy] = cycleFraction(arcX, arcY);
      const [chordFx, chordFy] = cycleFraction(chordX, chordY);

      const onArc = await page.evaluate(elementAtFraction, [
        `${stage('cycle')} .ig-cycle-svg`,
        arcFx,
        arcFy,
      ]);
      const onChord = await page.evaluate(elementAtFraction, [
        `${stage('cycle')} .ig-cycle-svg`,
        chordFx,
        chordFy,
      ]);

      expect(onArc?.classes, `arc ${i}: its true midpoint must be painted`).toContain(
        'ig-cycle-arrow',
      );
      expect(
        onChord?.classes,
        `arc ${i}: the straight-chord midpoint must not be painted — that would be a polygon, not a ring`,
      ).not.toContain('ig-cycle-arrow');
    }
  });

  test('each label sits along its own node’s angle, outside the ring', async ({ page }) => {
    const nodes = await page.evaluate(rectsOf, [stage('cycle'), '.ig-cycle-node']);
    const labels = await page.evaluate(rectsOf, [stage('cycle'), '.ig-cycle-label']);
    expect(labels).toHaveLength(nodes.length);

    const centre = (r) => [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
    const cx = nodes.reduce((s, n) => s + centre(n)[0], 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + centre(n)[1], 0) / nodes.length;
    const angleOf = (r) => {
      const [x, y] = centre(r);
      return Math.atan2(y - cy, x - cx);
    };

    for (let i = 0; i < nodes.length; i++) {
      const nodeAngle = angleOf(nodes[i]);
      const labelAngle = angleOf(labels[i]);
      // Wrap-safe angular difference, via the angle between the two unit
      // vectors rather than a naive subtraction.
      const diff = Math.abs(
        Math.atan2(Math.sin(nodeAngle - labelAngle), Math.cos(nodeAngle - labelAngle)),
      );
      expect(diff, `label ${i} vs node ${i}, radians off`).toBeLessThan(0.05);

      // …and genuinely outside the ring, not sitting on top of its node.
      const [nx, ny] = centre(nodes[i]);
      const [lx, ly] = centre(labels[i]);
      expect(
        Math.hypot(lx - cx, ly - cy),
        `label ${i} must be further from the centre than its node`,
      ).toBeGreaterThan(Math.hypot(nx - cx, ny - cy));
    }
  });
});

/* ------------------------------------------------------------------ *
 * quadrant — four buckets, not a scatter plot
 * ------------------------------------------------------------------ */

test.describe('quadrant: four equal cells sharing the grid’s edges', () => {
  test('all four cells are the same size', async ({ page }) => {
    const cells = await page.evaluate(rectsOf, [stage('quadrant'), '.ig-quadrant-cell']);
    expect(cells).toHaveLength(4);

    const widths = cells.map((c) => c.width);
    const heights = cells.map((c) => c.height);
    expect(Math.max(...widths) - Math.min(...widths), 'cell widths').toBeLessThan(1);
    expect(Math.max(...heights) - Math.min(...heights), 'cell heights').toBeLessThan(1);
  });

  test('cells line up on a real 2×2 grid, in authored order', async ({ page }) => {
    // Document order is top-left, top-right, bottom-left, bottom-right — the
    // form's whole "just write it in order" contract. If a CSS regression ever
    // reordered the grid (e.g. column-major instead of row-major), the boxes
    // would still be four equal rectangles — only their actual positions would
    // catch it.
    const [tl, tr, bl, br] = await page.evaluate(rectsOf, [stage('quadrant'), '.ig-quadrant-cell']);

    expect(Math.abs(tl.top - tr.top), 'top row must share a top edge').toBeLessThan(1);
    expect(Math.abs(bl.top - br.top), 'bottom row must share a top edge').toBeLessThan(1);
    expect(Math.abs(tl.left - bl.left), 'left column must share a left edge').toBeLessThan(1);
    expect(Math.abs(tr.left - br.left), 'right column must share a left edge').toBeLessThan(1);

    expect(tr.left, 'top-right must sit right of top-left').toBeGreaterThan(tl.right - 1);
    expect(bl.top, 'bottom-left must sit below top-left').toBeGreaterThan(tl.bottom - 1);
  });

  test('each cell’s title sits above its own item list, not another cell’s', async ({ page }) => {
    const cells = await page.locator(`${stage('quadrant')} .ig-quadrant-cell`).all();
    expect(cells).toHaveLength(4);

    for (const cell of cells) {
      const title = await cell.locator('.ig-quadrant-title').boundingBox();
      const items = await cell.locator('.ig-quadrant-items').boundingBox();
      if (!title || !items) continue; // an empty cell has no item list to check
      expect(title.y, 'title must sit above its own item list').toBeLessThan(items.y);
    }
  });

  test('axis labels sit outside the 2×2 block', async ({ page }) => {
    const grid = (await page.evaluate(rectsOf, [stage('quadrant'), '.ig-quadrant-grid']))[0];
    const [xLabel] = await page.evaluate(rectsOf, [stage('quadrant'), '.ig-quadrant-x-label']);
    const [yLabel] = await page.evaluate(rectsOf, [stage('quadrant'), '.ig-quadrant-y-label']);

    expect(xLabel.top, 'x-axis label must sit below the grid').toBeGreaterThanOrEqual(
      grid.bottom - 1,
    );
    expect(yLabel.right, 'y-axis label must sit left of the grid').toBeLessThanOrEqual(
      grid.left + 1,
    );
  });
});

/* ------------------------------------------------------------------ *
 * Legibility guards that no single principle owns
 * ------------------------------------------------------------------ */

test.describe('legibility', () => {
  for (const { id } of CASES) {
    test(`${id}: nothing is clipped`, async ({ page }) => {
      const overflowing = await page.evaluate(overflowingIn, [figureIn(id)]);
      // A clipped label is invisible to a DOM test — the text is present,
      // correct and unreadable.
      expect(
        overflowing,
        `content is wider than its box:${listing(
          overflowing,
          (o) => `${o.selector} "${o.text}" ${o.scrollWidth}px in ${o.clientWidth}px`,
        )}`,
      ).toEqual([]);
    });

    test(`${id}: no two labels overlap`, async ({ page }) => {
      const collisions = await page.evaluate(textCollisionsIn, [figureIn(id)]);
      expect(
        collisions,
        `text elements overlap:${listing(collisions, (c) => `${c.a} × ${c.b} (${c.overlap}px²)`)}`,
      ).toEqual([]);
    });

    test(`${id}: the figure stays inside its container`, async ({ page }) => {
      const [box] = await page.evaluate(rectsOf, [`[data-case="${id}"]`, '.case-stage']);
      const [figure] = await page.evaluate(rectsOf, [stage(id), '.ig-figure']);

      expect(figure.left, `${id} overflows left`).toBeGreaterThanOrEqual(box.left - 1);
      expect(figure.right, `${id} overflows right`).toBeLessThanOrEqual(box.right + 1);
    });
  }
});
