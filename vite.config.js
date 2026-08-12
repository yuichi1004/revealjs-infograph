import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(p, import.meta.url));

/*
 * One config, two jobs.
 *
 * `vite`        → serves examples/ as the playground. The example deck imports
 *                 ../src/index.js directly, so there is no build step between
 *                 editing a form and seeing it on a slide.
 * `vite build`  → emits dist/infograph.iife.js + dist/infograph.css for decks
 *                 that load reveal.js from a <script> tag / CDN instead of a
 *                 bundler. Bundler users get src/ verbatim via the exports map,
 *                 so this build is *only* for the script-tag path.
 */
export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      root: 'examples',
      server: { open: true },
    };
  }

  return {
    build: {
      lib: {
        entry: src('./src/standalone.js'),
        name: 'RevealInfograph',
        formats: ['iife', 'es'],
        fileName: (format) => (format === 'iife' ? 'infograph.iife.js' : 'infograph.js'),
        cssFileName: 'infograph',
      },
      sourcemap: true,
    },
  };
});
