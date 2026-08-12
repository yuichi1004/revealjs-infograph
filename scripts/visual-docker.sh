#!/usr/bin/env bash
#
# Run the visual suite in the same container CI uses.
#
# Screenshot baselines are only meaningful if the thing that produced them is
# reproducible. Font rasterisation is the usual culprit: the same CSS renders a
# different set of pixels under a different freetype build, a different
# fontconfig, or a different font package — differences that no amount of
# threshold tuning distinguishes from a real regression.
#
# So the baselines belong to one environment, and this script is how you enter
# it. `npm run test:visual` (on the host) is fine for a quick look, but the
# screenshot comparisons there are advisory. This script, and CI, are the truth.
#
#   npm run test:visual:docker              # verify
#   npm run test:visual:update              # regenerate baselines
#   npm run test:visual:docker -- --grep venn
#
set -euo pipefail

# Must match the @playwright/test version in package.json: the image ships the
# browser build that version expects, and a mismatch fails loudly at startup.
IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for the visual suite (baselines are environment-specific)." >&2
  echo "See scripts/visual-docker.sh for why, or run 'npm run test:visual' for an" >&2
  echo "advisory host-local run." >&2
  exit 1
fi

exec docker run --rm \
  --network host \
  --ipc=host `# Chromium's default 64MB /dev/shm makes it crash on large pages` \
  -v "$ROOT":/work \
  -w /work \
  -u "$(id -u):$(id -g)" `# don't leave root-owned baselines in the working tree` \
  -e HOME=/tmp `# the mapped uid has no passwd entry, so give npx a writable HOME` \
  -e CI="${CI:-}" \
  "$IMAGE" \
  npx playwright test "$@"
