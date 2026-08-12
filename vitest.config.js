import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // happy-dom over jsdom: the plugin only needs DOM construction, class/attribute
    // handling and matchMedia — happy-dom covers those and starts in a fraction of
    // the time, which keeps `npm test` usable as an inner-loop tool.
    environment: 'happy-dom',
    include: ['test/**/*.test.js'],
    setupFiles: ['test/setup.js'],
    coverage: {
      include: ['src/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
});
