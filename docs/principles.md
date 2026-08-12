# Principles, and where they live

When this package claims to be "grounded in cognitive science," that doesn't mean listing
principles in a README — it means **baking them into defaults, validation, and warnings** in the
code. This table maps each principle to the file that implements it, so you also know where to
look if you ever want to break one.

Every principle is a **default**, not a rule. `advise()` only warns — it never refuses to render or
rewrites the output (`src/warn.js`).

## Two layers of verification

Each section below has a **visual verification** line. That's a test that measures geometry and
colour in a real browser, in `test/visual/principles.spec.js`. The reason this layer exists is
simple.

The unit suite (`npm test`) runs on happy-dom, which **computes no layout**. So most of what this
document claims — "the bars share a common baseline," "a label is drawn near its mark,"
"the intersection is really painted as a lens" — is unverifiable by a unit test, in principle.
Change one line of CSS and the bar baseline can drift 36px while all 145 unit tests stay green.
That actually happened — see the note under principle 1 below.

```sh
npm test                    # DOM structure (happy-dom, 2.6s)
npm run test:visual:docker  # rendered geometry and colour (a real browser)
```

Visual verification is not screenshot comparison. When it fails, it reports **which principle
broke and by how much** — e.g. "principle 1: bar left edges span 36.00px." You never have to
eyeball an image to guess the cause.

---

## 1. Preattentive attributes have a precision ranking

Position > length > angle > area > shading > hue — Cleveland & McGill's ranking of elementary
perceptual tasks. A figure that encodes a quantity as area traded away precision it could have had
from position, for decoration.

| Implementation                                                                                            | Where                                    |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Intent → form mapping. `part-of-whole` resolves to waffle, not a pie chart                                | `BY_INTENT` in `src/design/encode.js`    |
| Bar has a zero baseline and a shared left edge. The whole chart is one grid; rows are `display: contents` | `.ig-bar` in `styles/infograph.css`      |
| No axis truncation (it would make length stop meaning quantity)                                           | Comment at the top of `src/forms/bar.js` |
| Venn is the one form that uses area — the overlap _is_ the subject, and there's no quantity to judge      | `src/forms/venn.js`                      |

**Visual verification**: every `.ig-bar-fill`'s left edge agrees within ±1px, width ratios match
value ratios within ±1px, and every track shares a right edge (the `principle 1` describe block).

> This check found a real defect on day one. `.ig-bar-row` originally had its own independent
> grid, so each row's label column was measured separately and three bars started 36px apart on x.
> The DOM was correct and every unit test stayed green — only the length comparison itself was
> broken.

**Why no pie chart**: it would ask waffle's question — one that position can answer — using angle
and area, the two lowest-ranked tasks instead.

## 2. Working memory holds around four chunks

"7±2" is about rehearsed digit strings. What you can hold _while reading a figure at the same
time_ is closer to four.

| Implementation                                                          | Where                                                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Advise past `maxSeries: 4`                                              | `DEFAULTS` in `src/options.js`, `checkEncoding()` in `src/design/encode.js` |
| Venn never draws three circles (seven regions can't be solved mid-talk) | `src/forms/venn.js` (ignores `data-c` and explains why)                     |
| Compare is two-item only; three or more routes to bar                   | `src/forms/compare.js`                                                      |

**Visual verification**: the bundled examples don't trip their own advice (rendered series count ≤
4). A package that ships a figure it warns about isn't credible.

## 3. Spatial proximity — a legend splits attention

Put a legend next to a figure and the reader has to hold the colour-to-name mapping in mind while
reading the figure itself.

| Implementation                                                                            | Where                            |
| ----------------------------------------------------------------------------------------- | -------------------------------- |
| **Direct labelling by default**. `legend: false` in `DEFAULTS`                            | `src/options.js`                 |
| Bar puts the label at the start of each row, the value at the end of the bar              | `src/forms/bar.js`               |
| Venn puts each label at its own circle's x-position (geometry moves, label moves with it) | `label()` in `src/forms/venn.js` |
| Waffle places the value and label directly under the grid                                 | `src/forms/waffle.js`            |

**Visual verification**: a bar label shares vertical centre with its own row's track (±2px). A
venn label stays on its own side of the midline and still reaches its own circle. Moving
`data-overlap` actually moves the labels. Anything legend-shaped stays within 40px of the marks it
describes.

> A defect showed up here too. Venn labels were originally **centred** on their circle, so at
> `data-overlap="0.55"` the two labels overlapped by 494px². The direct labelling meant to avoid a
> legend had produced something harder to read than one. Labels now anchor at the circle's centre
> and point outward, so they never collide regardless of how much the circles overlap.

## 4. Signalling — exactly one emphasis

Two things emphasised is the same as none — the eye has nowhere to land.

| Implementation                                                                   | Where                               |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| Multiple `data-emphasis` marks: only the first survives, with advice             | `applyEmphasis()` in `src/parse.js` |
| An emphasised bar keeps its colour; the rest drop to gray                        | `src/forms/bar.js`                  |
| With no emphasis, every bar is the same colour (the whole category is the point) | same                                |

**Visual verification**: with no emphasis, every bar has exactly one fill colour. With emphasis,
the emphasised bar's colour differs from the rest, and the rest are all one colour. And:
**the emphasised bar's colour is identical to what every bar's colour was without emphasis** —
so the reader never has to learn "this new colour means important."

## 5. The consistency principle — decoration works against understanding

| Implementation                                                                                              | Where                               |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| No gradients, shadows, 3D, or decorative icons anywhere in the CSS                                          | all of `styles/infograph.css`       |
| Waffle's unfilled cells are a near-surface gray, not a second hue (so they don't read as a second category) | `.ig-waffle-cell`                   |
| Compare's decrease direction is never coloured red (a shrinking lead time is usually good news)             | comment on `.ig-compare-delta-down` |

**Visual verification**: no descendant of any form has a computed `background-image`, a
`text-shadow`, or a blurred/offset `box-shadow`. `inset 0 0 0 1px` (the waffle's cell borders) is
excluded — it's a hairline, not decoration.

## 5b. A sign is repeated, never enlarged

`waffle` and `bar` can draw their marks as silhouettes (`data-ig-symbol="person"`). That sounds
like it contradicts principle 5, and the rule that keeps it from doing so is Otto Neurath's
original ISOTYPE constraint:

> A sign is repeated, never enlarged.

Scaling one big symbol to encode a quantity replaces counting with an area judgement — fourth or
fifth in Cleveland & McGill's ranking, and the single most common way a pictorial chart misleads.
Repeating identical symbols leaves the reading task exactly as it was: counting for waffle, length
for bar. So a pictogram here is _the mark itself_, not an ornament laid on top of one, which is the
distinction principle 5 actually draws.

On the cost: Haroz, Kosara & Franconeri, "ISOTYPE Visualization: Working Memory, Performance, and
Engagement with Pictographs" (CHI 2015), found repeated pictographs did not hurt reading accuracy,
and did help recall and engagement.

| Implementation                                                                               | Where                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Silhouettes are a mask over the mark's own background — same element, same colour logic      | `styles/infograph.css`, `.ig-waffle-symbol` / `.ig-bar-glyph` |
| Only ever one fixed-size glyph; there is deliberately no API for a proportionally-filled one | `src/design/symbols.js`                                       |
| Every built-in is drawn on a **square** viewBox, so waffle cells stay square and countable   | `VIEWBOX` in `src/design/symbols.js`                          |
| A bar states what one symbol is worth, and derives a round unit if the author does not       | `unitFor()` / `niceUnit()` in `src/forms/bar.js`              |
| A fraction is a **clipped** whole symbol, never a shrunken one                               | `.ig-bar-glyph-partial`                                       |
| Advises past ~30 symbols on the longest bar, where counting stops working                    | `MAX_SLOTS` in `src/forms/bar.js`                             |

**Visual verification**: the pictogram waffle is still 100 cells, still square within 0.6px, still
ten distinct columns and ten distinct rows, still 44 filled contiguously — the identical assertions
the block waffle faces, unrelaxed. The pictogram bar is in the _same_ principle-1 loop as the plain
bars, so it has to pass "every bar starts at the same x" and "bar lengths are proportional to their
values" on the same terms. On top of that: glyph count equals value ÷ unit, every value-carrying
glyph is the same size, and the partial is a full-size glyph inside a narrow clipper.

The decoration probe (`decorationIn` in `test/visual/probes.js`) treats `mask-image` as decoration
**except** on the two mark classes, and asserts it appears nowhere else — so the exemption cannot
quietly spread to a container or a label.

> A defect this caught: the glyph inside a partial clipper is not a flex item, so it stayed
> `display: inline`, ignored its width and rendered at zero. The clipper's own width was still
> correct, so the bar's length stayed exactly proportional and every existing assertion passed —
> the fractional symbol was simply an empty gap. Only an assertion that measured the glyph itself
> could see it.

## 6. Progressive disclosure — let the pace match the audience

The same content, revealed in stages, reliably measures better than all at once.

| Implementation                                                             | Where                            |
| -------------------------------------------------------------------------- | -------------------------------- |
| `data-ig-fragment="steps"` turns each stage into a reveal.js fragment      | `src/forms/flow.js`              |
| A figure inside a fragment waits for `fragmentshown` before it animates in | `isPending()` in `src/motion.js` |

**Visual verification**: on a real deck, a flow whose fragments haven't fired yet waits; pressing
→ reveals it, and it settles into the resting state (opacity 1) (`test/visual/integration.spec.js`).

## 7. State causation explicitly — proximity alone doesn't mean "sequence"

Boxes in a row read as a Gestalt "group" by proximity alone. Something has to state direction.

| Implementation                                                                      | Where               |
| ----------------------------------------------------------------------------------- | ------------------- |
| Flow always draws an arrow between stages, never at the ends                        | `src/forms/flow.js` |
| Each stage is bordered (a common region — label and body bind before you read them) | `.ig-flow-step`     |
| Arrows are hidden from assistive tech (DOM order already states the sequence)       | `hideFromAt()`      |

**Visual verification**: the number of arrows equals stage count minus one, each arrow's centre
sits **inside the horizontal gap** between its two neighbouring stages (never floating off an
end), and every stage shares the same top edge.

## 8. Never make the audience do mental arithmetic

| Implementation                                                                          | Where                               |
| --------------------------------------------------------------------------------------- | ----------------------------------- |
| Compare computes the delta (absolute and relative) automatically as one quantity        | `delta()` in `src/forms/compare.js` |
| No relative change is shown when the baseline is ≤ 0 (it would be a meaningless number) | same                                |
| Waffle displays the exact value the author wrote, not the rounded cell count            | `src/forms/waffle.js`               |

**Visual verification**: compare's two values are rendered at the same font size (making one
larger would push a conclusion before the reader gets to compare the numbers).

## 9. Colour-vision diversity and legibility are different problems

"Can you read it" and "can you tell it apart" are different questions. The first is WCAG contrast
ratio; the second is ΔE2000 under simulated colour-vision deficiency.

| Implementation                                                                              | Where                                                      |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Contrast ratio, ΔE2000, and CVD simulation (Viénot LMS) are all implemented here            | `src/design/contrast.js`                                   |
| Mark/ink role split — mark is fill-only, ink is darkened past 4.5:1 for text                | `src/design/palette.js`                                    |
| Thresholds enforced in CI; change even one colour and the violation is reported by name     | `test/palette.test.js`                                     |
| A human-readable table                                                                      | `npm run validate:palette` (`scripts/validate-palette.js`) |
| The venn intersection label uses ink, not mark (mark-3 is 2.74:1 — too low to read as text) | `.ig-venn-label-ab`                                        |

**Why mark colours aren't held to 4.5:1**: every form direct-labels its marks, so a fill only needs
to be _tellable apart_, not _readable_. That's the basis for letting mark colours run more
saturated.

**Visual verification**: for **every piece of visible text** in a figure, the effective foreground
and background are composited from `getComputedStyle` and scored with `contrastRatio()` — the same
function the package ships. ≥24px, or ≥19px at weight 700, needs 3:1; everything else needs 4.5:1.
The same check runs against `examples/`, so it measures the value **after the host theme is
applied**.

> `test/palette.test.js` measures the palette **constants**. This check measures **what the
> cascade actually resolved to** — a different thing, and one that found a defect the other
> couldn't: `.ig-compare-arrow` was using `--ig-muted` (the bar's de-emphasis fill) as its text
> colour, rendering at 1.63:1. The one element stating the direction of "before → after" was, in
> practice, invisible.

## 9b. Tokens must resolve outside a deck too

**Visual verification**: render every form on a fixture page with no `.reveal` element present at
all, and check colour and geometry there.

> This also found a real defect. The `--ig-*` tokens were only defined under the `.reveal`
> selector, so on the `renderAll()` path the README documents as public API, **every token was
> undefined**. `background: var(--ig-mark-1)` collapsed to an invalid value and fell through to
> transparent — bars rendered with no colour at all. A unit test, which doesn't look at colour,
> couldn't have caught this. Tokens are now defined on both `:root` and `.reveal` (the `.reveal`
> copy is still needed so a host theme's tokens re-resolve correctly inside a deck).

## 10. Motion only when it means something

| Implementation                                                                                              | Where                                                         |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **The resting state is the finished state.** Animation is an added class; when it ends, nothing has changed | top of `src/motion.js`, `.ig-enter` in `styles/infograph.css` |
| `prefers-reduced-motion` and `isPrintView()` are checked fresh every time, never cached                     | `shouldAnimate()` in `src/motion.js`                          |
| Waffle cells stagger in 6ms steps (100 × 18ms would outlast a speaker's sentence)                           | `.ig-enter .ig-waffle-cell-on`                                |

This "resting state is the finished state" design is what makes every degraded path correct without
special-casing it. JS disabled, printed, reduced motion, seen before `ready` fires — all produce the
same correct figure.

**Visual verification**: across all three paths.

1. On the fixture (no reveal, no lifecycle at all), every figure has opacity 1, no transform, and
   square waffle cells — i.e. it is already finished **when nothing animated it**
2. Under `?print-pdf` plus print media emulation, every figure is fully painted and bar
   widths/cell dimensions are nonzero (a scaleX-dependent animation would print at zero width)
3. The same checks rerun under a Playwright project with `reducedMotion: 'reduce'`

The third re-runs the whole suite under a config switch, so every assertion tied to principle 10 is
also verified under reduced motion.

## 11. The same meaning reaches readers who can't see it

| Implementation                                                                                            | Where                              |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Only the shape layer is hidden from assistive tech; text labels stay in the tree                          | `hideFromAt()` in `src/a11y.js`    |
| Forms where geometry carries meaning (waffle / bar / compare) ship a hidden table                         | `dataTable()`                      |
| Forms where the text alone is already the full story (stat / flow / venn) skip the table (no double read) | each form                          |
| Every form is a `<figure>` with an accessible name (skippable as one unit)                                | `figure()`                         |
| The hidden table uses inline styles (survives even without CSS loaded)                                    | `visuallyHidden()` in `src/dom.js` |

Verified by looping the whole form registry in `test/a11y.test.js` — write a new form with no
accessible name and it fails the day you write it.

## 12. The geometry says what the markup says

The meaning handed to assistive tech and the shape a sighted reader sees must not disagree. Only a
real browser can verify this.

**Visual verification** (hit testing via `document.elementFromPoint` — no pixel decoding):

| Check                                                                      | What breaks if this fails                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| The point where the two circles overlap is painted as `.ig-venn-circle-ab` | The intersection reads as "a third category," contradicting the claim  |
| Outside the overlap, each circle paints alone                              | The lens isn't clipped and spreads across the whole shape              |
| Changing `data-overlap` actually changes how wide the lens is              | The attribute is being ignored                                         |
| Waffle is 100 cells, 10 columns, 10 rows, cells square within ±0.5px       | The "count the rows to read it" premise breaks                         |
| Filled cells run contiguous from the start (43.8% → exactly the first 44)  | Scattered fill can't be counted — loses to a pie chart on its own turf |
| No text is clipped (`scrollWidth <= clientWidth`)                          | A label exists, is correct, and can't be read                          |
| No two text elements overlap                                               | Direct labelling ends up harder to read than a legend                  |
| A figure never spills outside its container / slide                        | Edges get cut off when projected                                       |

`clip-path` participates in hit testing too, so if the lens clip ever breaks, this fails
immediately. Sample coordinates are computed from `VENN` and `centerDistance()` in
`src/design/tokens.js`, not hand-picked numbers — they keep targeting the same feature of the
drawing even if the canvas or radius changes.
