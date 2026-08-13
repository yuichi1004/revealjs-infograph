# Where these baseline images come from

**The PNGs currently committed here were generated inside
`mcr.microsoft.com/playwright:v1.62.1-noble`** (`npm run test:visual:update` →
`scripts/visual-docker.sh`). CI uses the same image, so `maxDiffPixels: 0` holds.

To regenerate, run the same command:

```sh
npm run test:visual:update
git add test/visual/__screenshots__
git commit -m "Regenerate visual baselines in the pinned container"
```

## If Docker isn't available

`scripts/visual-docker.sh` assumes the running user is in the `docker` group (`sudo usermod -aG
docker "$USER"`, then re-login or `newgrp docker`). Adding a user to the `docker` group is
effectively root-equivalent, so that's a call for whoever owns the machine. Without it, you can
still pull the images CI produced from the `playwright-report` artifact on a failed run.

## Adding or resizing a case can change baselines below it

The fixture stacks every case in one vertical column, and nothing in that column
measures a whole number of pixels — `.case-title` is 13px at `line-height: normal`, and a stage is
as tall as its figure needs (quadrant's is 440.313px). So each stage starts at a _fractional_ Y, and
a screenshot's height is `round(y + h) - round(y)`, which flips by a pixel depending on where in the
column the stage lands.

**Insert a case, reorder one, or change one's content, and an arbitrary subset of the cases _below_
it can shift by 1px** — whichever ones happened to sit near a rounding boundary. Nothing is wrong
with those figures; they are the same drawing at a different sub-pixel offset.

So when unrelated baselines go red right after you touch `cases.js`:

1. Don't assume container/font drift. That was assumed twice and was wrong both times — once in
   PR #11 (which left two baselines failing on every CI run until #30), and once in PR #28.
2. Regenerate them, then confirm each new image is the same drawing shifted, not a layout change.
   Comparing the old and new PNGs at a ±1px vertical offset is the quick test: a reposition matches
   almost exactly at some offset, a real regression matches at none.
3. Appending a case to the end of `CASES` disturbs nothing above it, so it is the cheapest place to
   add one.

Snapping every stage to a whole pixel does remove this, but it re-rasterises text at a new sub-pixel
phase across the whole suite — measured at up to 3.3% of pixels differing per image, which is more
than enough to hide a real regression inside a 16-image diff. Not worth it; see #30.

## Why the diff threshold stays at zero

`playwright.config.js` sets `maxDiffPixels: 0`. Raising the threshold enough to absorb font
rendering differences would also absorb small real regressions (a 1px shift, a slight colour
change) at the same time. Pinning the environment is more reliable than tuning a tolerance.

**`principles.spec.js` and `integration.spec.js` are unaffected by any of this** — they measure
geometry and colour, not pixels, so they're environment-independent. The actual point of this
suite (verifying the principles visually) works regardless of where these baseline images came
from.
