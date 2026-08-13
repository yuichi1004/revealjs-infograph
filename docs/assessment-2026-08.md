# Cognitive-science assessment — August 2026

An audit of the shipped design against the literature it claims to be grounded in. Two questions,
asked of every form: do the claims in `docs/principles.md` hold **in the rendered output**, and
what do lenses that document does not yet apply — legibility at viewing distance, icon semantics,
CJK typography — turn up?

**Method.** Three evidence passes, none of them code-reading alone:

1. All 21 committed baselines in `test/visual/__screenshots__/screenshots.spec.js/`, read as images.
2. The `examples/` deck served and screenshotted at 1920×1080, with effective type sizes measured
   (`getComputedStyle` × the reveal scale factor, 1.41 at that viewport).
3. Twelve ad-hoc stress cases — Japanese labels, higher element counts, host-level emphasis —
   rendered through `renderAll()` on a bare page. The exact markup for every case is in the
   appendix, so each observation is reproducible.

Every High/Medium finding below is backed by a rendered artifact. Findings are ranked: **High** — a
reader can be actively misled, or a core guarantee breaks; **Medium** — avoidable cognitive load or
a silent inconsistency; **Low** — polish.

---

## High

### H1. A wrapped flow breaks the causal chain it exists to state

**Observation.** `.ig-flow` is `flex-wrap: wrap` with each arrow as its own flex item. When steps
don't fit one row, the arrow before the wrap is stranded at the end of the line, pointing at empty
space, and the place where the sequence actually continues — the next row — has no connector at
all. This is not hypothetical: the committed baseline **`deck-flow-revealed.png` shows it** (three
steps at deck scale: "Intervention →" points off the row edge while "Result" sits below), and a
five-step flow at the default 42rem figure width reproduces it immediately (appendix, `flow-5steps`).

**Principle.** The package's own principle 7: proximity alone reads as a _group_ (Wertheimer);
something must state direction, and flow's whole justification for its arrows is that they sit "in
the gaps between steps, never at the ends." After a wrap, an arrow sits at an end, and a real gap
in the sequence has none. The visual test passes only because the fixture is always wide enough
never to wrap.

**Impact.** The reader loses the sequence exactly when it is longest — and the accepted baseline
means this defect has already shipped as "expected."

**Recommendation.** Make the arrow and its following step wrap as one unit (wrap an
`arrow + step` pair in a nowrap flex group), or switch the whole figure to a vertical layout below
a container-width threshold with arrows rotated 90°. Add a narrow-viewport visual case so the
suite exercises the wrapped state. While there: flow is the only multi-element form with **no
upper-bound advisory** (pyramid advises past 7, cycle past 8) — a step count high enough to force
wrapping should advise.

### H2. The quadrant y-axis label renders Japanese upside down

**Observation.** `.ig-quadrant-y-label` uses `writing-mode: vertical-rl` + `transform:
rotate(180deg)`. For Latin text this yields the intended bottom-up rotated label. For CJK text the
same pair renders **every glyph upside down, in bottom-to-top order**: `data-y-label="重要度"`
comes out as 度/要/重 with each kanji flipped. Verified side by side at 3× device scale
(same markup, only the label text changed).

**Principle.** Legibility is the precondition for everything else this package argues; inverted
glyphs are worse than rotated ones (rotated text already reads measurably slower — Wigdor &
Balakrishnan, 2005 — but inverted CJK is simply wrong, not slow).

**Impact.** Every Japanese-authored quadrant — the primary real-world use of this package — has a
broken axis label.

**Recommendation.** In `vertical-rl`, CJK glyphs are already upright and read naturally
top-to-bottom, so the 180° flip must only ever apply to horizontal-script text. The clean fix is
`writing-mode: sideways-lr` (upright-script-aware, bottom-up for Latin) with a `vertical-rl`,
no-transform fallback; the conservative fix is to drop the rotation when the label contains CJK.
Add a CJK quadrant to the visual fixtures either way — none of the current cases contain a single
CJK character, which is how this survived.

### H3. `checkEncoding` contradicts the sequential forms' own ceilings — and the shipped example trips it

**Observation.** `checkEncoding()` (`src/design/encode.js`) applies `maxSeries: 4` to **every**
form. But `pyramid.js` sets `MAX_TIERS = 7` with a comment explicitly arguing that `maxSeries`
does not apply to tiers read sequentially, and `cycle.js` sets `MAX_STAGES = 8` on the same
grounds. Result, verified live: loading `examples/` fires
`"pyramid has 5 items; more than 4 is hard to hold in mind"` on the flagship Maslow slide, and a
6-stage cycle is advised twice with two different ceilings — "more than 4 is hard to hold in mind"
(encode.js) while its own form is content up to 8.

**Principle.** The distinction pyramid's comment draws is real: Cowan's ~4-chunk limit (BBS 2001)
is about items held **simultaneously** while decoding; a list read one tier at a time is a
different task. The package's own §2 claim — "the bundled examples don't trip their own advice. A
package that ships a figure it warns about isn't credible" — is currently false in the console of
its own demo deck. The visual test enforcing that claim only counts **bar tracks** in four bar
cases, so it cannot see this.

**Impact.** Authors following the advisories get contradictory guidance, and the credibility rule
the package sets for itself is violated by its own example.

**Recommendation.** Scope the `maxSeries` advisory to simultaneous-decode forms (bar series;
waffle's multi-value case is already separately advised) — e.g. a per-form flag in the registry, or
move the count check into the forms that own their ceilings. Extend the "examples don't trip their
own advice" check to fail on **any** `[infograph]` console warning emitted while the examples deck
loads; that is the assertion the claim actually needs.

---

## Medium

### M1. `flow` silently ignores host-level `data-emphasis`

**Observation.** `<div data-infograph="flow" data-emphasis="2">` renders three identical steps —
no `.ig-flow-step-on`, no visual change at all (appendix, `flow-emphasis`). Cause: `flow.js` is the
only multi-item form that never calls `applyEmphasis()`; pyramid, cycle, bar and quadrant all
honour the host attribute. The CSS for the emphasised state exists and is unreachable through the
documented attribute.

**Principle.** Principle 4 (signalling — Mayer) is stated package-wide: one emphasis channel,
available everywhere. A silent no-op is the worst failure mode an API has: the author believes the
signal was sent.

**Recommendation.** One line — `applyEmphasis(readItems(host, 'step'), data.emphasis, host)` — plus
a unit test asserting parity across all item forms (a loop over the registry, in the style of
`a11y.test.js`, so the next form cannot regress it).

### M2. Cycle labels collide with arcs and nodes at ≥ 6 stages or with Japanese-length names

**Observation.** At 6 stages with Japanese labels, the diagonal labels (実験を設計する,
方針を更新する) visibly cross the arcs; at 8 English stages, "Assign" touches its own node
(appendix, `cycle-6-ja`, `cycle-8`). Cause: every label is _centred_ at `labelRadius` with
`white-space: nowrap`, so half of a long label extends back toward the ring; the safe margin was
tuned on 2–5-character English words ("Plan", "Check"). Nothing advises about label length, and no
fixture exercises either configuration.

**Principle.** The package's principle 12 ("no two text elements overlap", "no text is clipped")
plus Gestalt figure-ground: text crossing a stroke degrades both.

**Recommendation.** Anchor the label's **near edge**, not its centre, at the label radius — shift
each label outward along its own angle by half its rendered width (the same outward-anchoring move
venn's labels already made for exactly this reason, one form over). Add `cycle-6-ja` and `cycle-8`
to the visual cases so the legibility loop measures them.

### M3. Bar values sit at the track's end, not the bar's — and the docs claim otherwise

**Observation.** In `bar-plain.png`, the values 34/52/71 are right-aligned in a third grid column
at the figure's right edge. The shortest bar ends mid-figure; its value floats ~250px away across
empty track. `docs/principles.md` §3 states "Bar puts … the value at the end of the bar" — as
rendered, that is not true; the value is at the end of the _row_.

**Principle.** Spatial contiguity (Mayer; Gestalt proximity): the number should bind to its bar.
There is a genuine trade-off — the aligned column gives tabular-nums digit alignment, which aids
value-to-value comparison — but the current layout buys it with a doc claim that is false and a
binding that weakens as bars get short.

**Recommendation.** Either (a) place each value just past its own bar's end (direct labelling,
strongest binding; digit alignment is lost), or (b) keep the column and correct the §3 claim,
optionally tightening the track (`max-content` middle column already exists in symbol mode). This
is a judgement call worth making deliberately; today it is being made by accident.

### M4. Long venn labels clip at the figure edge

**Observation.** `data-a="社内開発とグローバル化推進の長期戦略"` renders with its first characters
cut off at the container's left edge (appendix, `venn-long-a`): the A label is anchored at its
circle's centre and translated `-100%`, so a label longer than the space left of that centre
overflows and is clipped. Principle 12's "no text is clipped" check never sees it because every
fixture label is short, and `scrollWidth`-based clipping probes don't catch transform overflow.

Related, lower-stakes observation while in this form: the intersection label binds to the lens by
colour alone (green text, two lines below the circles, ~150px from the lens at default overlap) —
defensible placement given the collision history documented in the CSS, but colour-only binding is
the weakest Gestalt cue and worth revisiting if the lens label ever grows optional.

**Recommendation.** Clamp: after layout, if a label's box exits the figure, shift it inward (or
allow wrapping past a width threshold for CJK, which has no spaces to break on). Add a long-CJK
venn to the fixtures.

### M5. Unfilled pictogram cells read as a second category of people

**Observation.** In `waffle-symbol.png`, the 56 unfilled cells are **person silhouettes in
`--ig-muted` gray** — darker and more figural than the plain waffle's near-surface empty squares.
A gray square reads as "empty track"; a gray _person_ reads as "a person in the other group" —
i.e. "56 people who disagreed," a claim the data does not make. The CSS comment acknowledges the
unfilled glyphs "need to carry themselves" once the hairline is gone, but the fix chosen (de-emphasis
gray borrowed from bar) is the same colour bar uses for real, present-but-de-emphasised _data_.

**Principle.** Pictographs carry object semantics, which is exactly why they aid recall (Haroz,
Kosara & Franconeri, CHI 2015) — the semantics attach to the unfilled marks too. Principle 5's own
waffle rule ("unfilled cells must read as 'the rest of the whole', not a second category") is what
the symbol mode quietly relaxes.

**Recommendation.** Push unfilled glyphs toward ground: a lighter gray at or near
`--ig-surface-2`'s prominence, or an outline-style variant. Keep them countable (the 100-cell
denominator is the form's point) but unmistakably "not yet," not "the others."

### M6. The `alert` icon is a plain triangle — and the stated reason for omitting the "!" doesn't hold

**Observation.** `data-icon="alert"` renders a bare solid triangle (`flow-icons.png`,
`quadrant-icons.png`). Without the exclamation mark, the caution reading is not privileged: a solid
triangle cues "play", "delta", or "up" just as readily. The comment in `symbols.js` says adding the bang
"would need bezier-perfect winding on non-circular geometry" — but the file's own `gear` and
`clock` already punch holes with reversed winding, and a reversed-winding **rectangle** (the bang's
bar) plus a small reversed square (its dot) are the simplest holes possible: reverse the point
order, done.

**Principle.** Icon identification depends on semantic transparency/concreteness (McDougall, Curry
& de Bruijn, 1999): the icon must cue the label before it can dual-code it (Paivio). An ambiguous
icon adds decoding load instead of removing it — the exact trade §5c promises never to make.

**Recommendation.** Add the exclamation cutout as two counter-wound subpaths, and correct the
comment. Sanity-check the other seven at 1.25em while there (`gear` at small sizes drifts toward
"sun"; acceptable, but worth a look at real slide distance).

### M7. The smallest text in the figure is the one number needed to decode it

**Observation.** In symbol-mode bar, the unit key "⚑ = 10" is set at `0.85rem` — 13.6px computed,
**19.2px rendered** at 1920×1080 (reveal scale 1.41), the smallest text in any form. On a 2.5m
projected image viewed from 6m, 19.2px is ≈ 25mm cap height ≈ 0.24°, with x-height around 0.12° —
at or below the critical print size for fluent reading (fluent reading needs roughly 0.2°–2°
x-height; Legge & Bigelow, _Journal of Vision_ 2011). Every other text role clears the bar
comfortably (stat value 72px, labels 28px, notes 21px).

**Principle.** The unit is not a caption — it is the scale. Without it the glyph count cannot be
mapped to a value, so the figure's _decoding key_ is its least legible element, inverting the
information hierarchy.

**Recommendation.** Raise `.ig-bar-unit` to `var(--ig-note-size)` and keep it adjacent to the
first row of glyphs (proximity to the marks it calibrates). The same review applies to
`--ig-note-size` text generally at the back of large rooms — 21px rendered is marginal at 10m —
but the unit key is the one place where smallness costs decoding rather than detail.

---

## Low

### L1. Pyramid's accessible name asserts a sequence it doesn't have

`pyramid.js` derives its `aria-label` by joining tiers with `' → '` — the same operator flow and
cycle use to state _sequence_. A screen-reader user hears "Self-actualization → Esteem → …", i.e.
a process, where the sighted reader sees a hierarchy. Join with commas, or state the relation
("…, above …"); reserve `→` for the two forms whose geometry actually means it. (Principle 12's own
rule: the markup must say what the geometry says — this is its accessible-tree dual.)

### L2. `renderAll()` without a config crashes every figure

README line 15 claims "`renderAll()` works on a plain HTML page", but `renderAll(root)` with no
second argument throws `Cannot read properties of undefined (reading 'maxSeries')` inside
`checkEncoding` for **every** figure, each falling back to raw markup (observed live; the per-host
try/catch turns it into 12 advisories). Line 86 shows the real contract
(`renderAll(document.body, resolveConfig())`). Default the parameter —
`config = resolveConfig()` — and the headline claim becomes true.

### L3. Blue is both chrome and signal in the card forms

Flow kickers and quadrant titles are `--ig-ink-1` blue on every card; emphasis (`-on`) is a
`--ig-mark-1` blue border. A singleton pops out preattentively only if unique on its feature
dimension (Treisman & Gelade, 1980) — an emphasised card must be found among cards that are
already partly blue. Bar avoids this exactly (gray field, one blue bar). Consider `--ig-text-2`
kickers, or give `-on` a surface tint so the emphasis differs in a channel the chrome doesn't use.

### L4. Waffle's caption sits beside the empty region

The grid fills top-down from the top-left (reading order — defensible, countable), which places the
44 filled cells maximally far from the "43.8% Respondents who agreed" caption at the bottom, so the
value visually abuts the _unfilled_ rows. Bottom-up fill (ISOTYPE's level metaphor: 43.8% "full")
would put the filled block against the caption and still be countable from the bottom row. A
trade-off, not a defect — worth a deliberate decision and one sentence in the README either way.

### L5. Doc drift: §5c describes the icon-proximity test the suite no longer runs

`docs/principles.md` §5c says icons are verified "nearer, by **centre-to-centre distance**, to
their own label" — the shipped test deliberately uses minimum rectangle-gap distance instead
(centre-to-centre misfires on wide labels; that is why it was changed). Update the sentence to
match the better test.

---

## What held up

Checked and confirmed against the rendered output, not just asserted: the bar's shared left edge
and right-edge common scale; the emphasis identity rule (the emphasised bar keeps the exact colour
all bars had unemphasised — no new colour to learn); compare's equal value sizes and the refusal to
colour "down" red; the venn lens painted as a true clipped intersection at all three overlaps with
outward-anchored labels that no longer collide; pyramid's rank-only widths (values printed, never
encoded, with the advisory to switch forms); cycle's clockwise top-start ring, arc (not chord)
connectors, and the closure stated in the accessible name; quadrant's both-ends axis naming and
top-side x-label; icons held to fixed size, `aria-hidden`, with coverage and label-less advisories
firing as documented; entrance motion that ends in the resting state with reduced-motion and print
parity; and full-width Japanese punctuation (`、` / `：`) parsing correctly in every shorthand it
touches. These are real, tested strengths; nothing in this report weakens them.

---

## Priorities at a glance

| #     | Finding                                                                                 | Priority | Effort |
| ----- | --------------------------------------------------------------------------------------- | -------- | ------ |
| H1    | Wrapped flow strands its arrows                                                         | High     | M      |
| H2    | CJK y-axis label upside down                                                            | High     | S      |
| H3    | maxSeries advisory contradicts sequential forms; example trips it                       | High     | S      |
| M1    | flow ignores host `data-emphasis`                                                       | Medium   | S      |
| M2    | cycle label/arc collisions at 6+ stages or CJK lengths                                  | Medium   | M      |
| M3    | bar value placement vs. §3 claim                                                        | Medium   | S–M    |
| M4    | long venn labels clip                                                                   | Medium   | M      |
| M5    | unfilled pictogram cells read as a category                                             | Medium   | S      |
| M6    | `alert` lacks its exclamation mark                                                      | Medium   | S      |
| M7    | unit key is the least legible text                                                      | Medium   | S      |
| L1–L5 | a11y phrasing, `renderAll()` default, chrome/signal blue, waffle fill anchor, §5c drift | Low      | S each |

---

## Appendix — stress-case markup

Rendered via `renderAll(holder, resolveConfig())` on a bare page (no `.reveal`), Chromium,
900px-wide viewport. Each case is one paste away from reproduction.

```html
<!-- flow-5steps: wraps at the default 42rem figure width; second-row arrow strands -->
<div data-infograph="flow">
  <div data-step="Discover">Interviews</div>
  <div data-step="Define">Problem statement</div>
  <div data-step="Develop">Prototypes</div>
  <div data-step="Deliver">Pilot rollout</div>
  <div data-step="Measure">Adoption metrics</div>
</div>

<!-- flow-emphasis: renders identically to no emphasis at all -->
<div data-infograph="flow" data-emphasis="2">
  <div data-step="Problem">Fragmented teams</div>
  <div data-step="Intervention">Culture integration</div>
  <div data-step="Result">66% shorter lead time</div>
</div>

<!-- cycle-6-ja: diagonal labels cross the arcs -->
<div data-infograph="cycle">
  <ul>
    <li>仮説を立てる</li>
    <li>実験を設計する</li>
    <li>実装する</li>
    <li>計測する</li>
    <li>学びをまとめる</li>
    <li>方針を更新する</li>
  </ul>
</div>

<!-- cycle-8: "Assign" touches its own node -->
<div data-infograph="cycle">
  <ul>
    <li>Intake</li>
    <li>Triage</li>
    <li>Assign</li>
    <li>Fix</li>
    <li>Review</li>
    <li>Test</li>
    <li>Ship</li>
    <li>Monitor</li>
  </ul>
</div>

<!-- quadrant-ja: y-label 重要度 renders upside down -->
<div
  data-infograph="quadrant"
  data-x-label="緊急度"
  data-columns="緊急、緊急でない"
  data-y-label="重要度"
  data-rows="重要、重要でない"
>
  <div data-label="すぐやる">
    <ul>
      <li>本番障害の対応</li>
      <li>本日締切の提出物</li>
    </ul>
  </div>
  <div data-label="計画する">
    <ul>
      <li>来期ロードマップの策定</li>
    </ul>
  </div>
  <div data-label="任せる">
    <ul>
      <li>定型メールの返信</li>
    </ul>
  </div>
  <div data-label="やめる">
    <ul>
      <li>SNSの巡回</li>
    </ul>
  </div>
</div>

<!-- venn-long-a: label A clips at the figure's left edge -->
<div
  data-infograph="venn"
  data-overlap="0.35"
  data-a="社内開発とグローバル化推進の長期戦略"
  data-b="海外拠点"
  data-ab="文化統合"
></div>

<!-- bare renderAll: every figure fails with a maxSeries TypeError -->
<script type="module">
  import { renderAll } from 'revealjs-infograph';
  renderAll(document.body); // README line 15 says this works; it does not
</script>
```

## References

- Cleveland, W. S., & McGill, R. (1984). Graphical perception: Theory, experimentation, and
  application to the development of graphical methods. _JASA_, 79(387).
- Cowan, N. (2001). The magical number 4 in short-term memory. _Behavioral and Brain Sciences_, 24.
- Haroz, S., Kosara, R., & Franconeri, S. (2015). ISOTYPE visualization: Working memory,
  performance, and engagement with pictographs. _CHI 2015_.
- Legge, G. E., & Bigelow, C. A. (2011). Does print size matter for reading? A review of findings
  from vision science and typography. _Journal of Vision_, 11(5).
- Mayer, R. E. (2009). _Multimedia Learning_ (2nd ed.) — coherence, signalling, spatial contiguity,
  segmenting.
- McDougall, S., Curry, M., & de Bruijn, O. (1999). Measuring symbol and icon characteristics.
  _Behavior Research Methods, Instruments, & Computers_, 31.
- Paivio, A. (1986). _Mental Representations: A Dual Coding Approach_.
- Treisman, A., & Gelade, G. (1980). A feature-integration theory of attention. _Cognitive
  Psychology_, 12.
- Wigdor, D., & Balakrishnan, R. (2005). Empirical investigation into the effect of orientation on
  text readability in tabletop displays. _ECSCW 2005_.
