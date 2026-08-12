import { beforeEach, afterEach, vi } from 'vitest';
import { resetWarnings } from '../src/warn.js';

/*
 * Two pieces of global state exist in this package and both are here.
 *
 * `advise()` remembers which messages it has already printed so a deck with
 * fifteen figures does not print the same advice fifteen times. That cache is
 * exactly the wrong thing to keep between test cases, so it is cleared here.
 *
 * console.warn is stubbed rather than left alone: the advisory messages are a
 * feature, so a good number of tests deliberately trigger them, and an
 * unstubbed run buries the actual test output. Tests that assert on advice read
 * the spy back via `vi.mocked(console.warn)`.
 */
beforeEach(() => {
  document.body.innerHTML = '';
  resetWarnings();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
