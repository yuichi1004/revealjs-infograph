# Contributing

This is the contributor-facing companion to [README.md](README.md) (how to use the plugin) and
[docs/principles.md](docs/principles.md) (why it's built the way it is).

## Setup

```sh
npm ci
npm run dev              # starts examples/ so you can eyeball every form
npm test                 # vitest (happy-dom, no reveal.js, under 3s)
npm run test:watch
npm run lint
npm run typecheck        # checks the JSDoc types via checkJs
npm run validate:palette # prints the contrast-ratio / CVD ΔE table
npm run build            # emits dist/ (IIFE + CSS) and types/
```

The unit suite never loads reveal.js at all (`test/helpers/deck.js` fakes the four methods it
needs). Real-world verification happens in the `examples/` playground, which is also deployed to
GitHub Pages as living documentation.

## Visual testing

The unit suite runs on happy-dom, which **computes no layout**. Whether bars share a common
baseline, a label is drawn near its mark, or an intersection is actually painted as a lens can only
be checked in a real browser. That's what `test/visual/` is for.

```sh
npm run test:visual:docker  # canonical — runs inside the same container as CI
npm run test:visual         # host-local (fast; screenshot comparisons are advisory only)
npm run test:visual:update  # regenerate screenshot baselines
npm run test:visual:report  # open the HTML diff report after a failure
```

Three kinds of test live there:

| File                  | What it checks                                                        | Environment-sensitive |
| --------------------- | --------------------------------------------------------------------- | --------------------- |
| `principles.spec.js`  | Asserts principles directly as geometry and colour — no golden images | No                    |
| `integration.spec.js` | Print / reduced-motion / fragments / auto-animate on a real deck      | No                    |
| `screenshots.spec.js` | Visual regression for anything no one wrote a rule for                | Yes                   |

The first two report failures with the actual measurement — e.g. "principle 1: bar left edges span
36.00px" — so you don't have to eyeball an image to find the cause. See each principle's "visual
verification" note in [docs/principles.md](docs/principles.md) for what's covered where.

Screenshot baselines are the one environment-sensitive part (font rasterisation varies by
platform), so they're only ever generated inside the pinned Playwright Docker image. Details and
current provenance: [`test/visual/__screenshots__/PROVENANCE.md`](test/visual/__screenshots__/PROVENANCE.md).

They're also **position**-sensitive: the fixture stacks the cases in one column at fractional
heights, so adding, reordering or resizing a case in `test/visual/cases.js` can shift baselines
_below_ it by a pixel. That's a rounding artefact, not drift and not a regression — regenerate the
affected images and check each is the same drawing at a 1px offset. Appending a new case to the end
of `CASES` avoids it entirely. PROVENANCE.md has the full explanation.

## Language policy

Conversation and issues can be in whatever language is convenient. Source code, comments, and
documentation in this repository are in English.
