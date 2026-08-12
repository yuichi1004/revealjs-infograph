import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/*
 * The dev server the visual suite runs against.
 *
 * Separate from the root vite.config.js because that one roots at `examples/`
 * (so `npm run dev` opens the playground directly), and the visual suite needs
 * *both* trees served from one origin:
 *
 *   /test/visual/fixtures/forms.html   figures with no reveal.js around them
 *   /examples/index.html               the real deck, for integration checks
 *
 * Rooting at the repo means both are reachable and both resolve ../../src/
 * imports the same way they would in a consumer's bundler.
 */
export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  server: {
    port: 5174,
    strictPort: true,
    // The suite may run inside the Playwright container while the server runs
    // on the host (or vice versa); binding all interfaces keeps both directions
    // working without a second config.
    host: true,
  },
  // Nothing is cached between runs: a stale optimised dep would make a visual
  // failure depend on which order the suites ran in.
  optimizeDeps: { force: true },
});
