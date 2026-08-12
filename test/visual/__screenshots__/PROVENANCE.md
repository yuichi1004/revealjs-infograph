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

## Why the diff threshold stays at zero

`playwright.config.js` sets `maxDiffPixels: 0`. Raising the threshold enough to absorb font
rendering differences would also absorb small real regressions (a 1px shift, a slight colour
change) at the same time. Pinning the environment is more reliable than tuning a tolerance.

**`principles.spec.js` and `integration.spec.js` are unaffected by any of this** — they measure
geometry and colour, not pixels, so they're environment-independent. The actual point of this
suite (verifying the principles visually) works regardless of where these baseline images came
from.
