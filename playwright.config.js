import { defineConfig, devices } from '@playwright/test';

/*
 * The visual suite.
 *
 * Two kinds of test live under test/visual/, and the split matters:
 *
 *   principles.spec.js / integration.spec.js — assert geometry and colour in a
 *     real browser. No golden images. When one fails it names the principle
 *     that broke and prints the measurement, so the diagnosis does not depend
 *     on anyone squinting at a diff.
 *
 *   screenshots.spec.js — golden images, for the changes an assertion cannot
 *     anticipate.
 *
 * Determinism over tolerance: retries are 0 and the screenshot threshold is 0.
 * A flaky visual suite gets muted within a month, and a muted suite is worse
 * than no suite. Everything that could vary is pinned instead — the browser and
 * font stack by the Docker image (scripts/visual-docker.sh), the font file by
 * @fontsource-variable/inter, animation by `animations: 'disabled'`, and device
 * pixel ratio by deviceScaleFactor: 1.
 */

const PORT = 5174;

export default defineConfig({
  testDir: './test/visual',
  testMatch: '**/*.spec.js',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html'], ['list']] : [['list']],

  // Baselines sit next to the specs rather than in a sibling tree of directories
  // per-platform: they are only ever generated in one environment, so a
  // platform suffix would be a lie about how portable they are.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: 'disabled',
      // Fonts finish loading before any shot; without this the first screenshot
      // of a run can catch a fallback face.
      caret: 'hide',
    },
  },

  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      // Principle 10 — "the resting state is the finished state" — is only
      // really tested when the browser reports reduced motion, because that is
      // the path where the plugin refuses to add its animation class at all.
      // A separate project rather than a per-test context so the setting
      // applies to the page from first paint.
      name: 'reduced-motion',
      testMatch: /principles\.spec\.js|integration\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        reducedMotion: 'reduce',
      },
    },
  ],

  webServer: {
    command: `npx vite --config test/visual/vite.config.js --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/test/visual/fixtures/forms.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
