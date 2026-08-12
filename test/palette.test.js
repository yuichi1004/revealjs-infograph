/**
 * The palette's claims, asserted.
 *
 * This file is the reason the colour comments in src/design/palette.js and
 * styles/infograph.css can be trusted: change a hex value and the specific
 * property it violates fails by name, with the measured number.
 */

import { describe, it, expect } from 'vitest';
import {
  PALETTES,
  THRESHOLDS,
  auditPalette,
  resolvePalette,
  seriesVar,
} from '../src/design/palette.js';
import {
  contrastRatio,
  deltaE,
  simulateCvd,
  separation,
  parseHex,
  parseCssColor,
  flatten,
} from '../src/design/contrast.js';

describe('colour maths', () => {
  it('matches the WCAG reference ratio for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is symmetric in its arguments', () => {
    expect(contrastRatio('#2a78d6', '#fcfcfb')).toBeCloseTo(
      contrastRatio('#fcfcfb', '#2a78d6'),
      10,
    );
  });

  it('reads short and long hex the same', () => {
    expect(parseHex('#fff')).toEqual(parseHex('#ffffff'));
  });

  it('reports zero difference between a colour and itself', () => {
    expect(deltaE('#2a78d6', '#2a78d6')).toBeCloseTo(0, 10);
  });

  it('collapses red and green for a deuteranope', () => {
    // The premise of the whole CVD check: two colours that are far apart in
    // normal vision can be nearly identical under simulation.
    const normal = deltaE('#d62a2a', '#2ad64a');
    const deutan = deltaE(simulateCvd('#d62a2a', 'deutan'), simulateCvd('#2ad64a', 'deutan'));
    expect(normal).toBeGreaterThan(60);
    expect(deutan).toBeLessThan(normal / 2);
  });

  it('leaves a gray unchanged under simulation', () => {
    // A neutral has no chromatic information to lose, so any correct simulation
    // is close to the identity on it.
    expect(deltaE('#808080', simulateCvd('#808080', 'deutan'))).toBeLessThan(2);
  });

  it('reports the worst case across all vision types', () => {
    const s = separation('#2a78d6', '#1baf7a');
    expect(s.worst).toBe(Math.min(s.normal, s.protan, s.deutan, s.tritan));
  });
});

describe.each(Object.keys(PALETTES))('palette "%s"', (name) => {
  const palette = PALETTES[name];
  const { checks } = auditPalette(palette);

  it('has one ink per mark', () => {
    expect(palette.inks).toHaveLength(palette.marks.length);
  });

  it.each(checks.map((c) => [`${c.label} — ${c.metric}`, c]))('%s', (_label, check) => {
    expect(
      check.value,
      `${check.label}: ${check.metric} was ${check.value.toFixed(2)}, floor is ${check.min}`,
    ).toBeGreaterThanOrEqual(check.min);
  });

  it('passes as a whole', () => {
    expect(auditPalette(palette).pass).toBe(true);
  });

  it('keeps every ink readable as small text', () => {
    for (const ink of palette.inks) {
      expect(contrastRatio(ink, palette.surface)).toBeGreaterThanOrEqual(THRESHOLDS.inkContrastMin);
    }
  });
});

/*
 * parseCssColor and flatten exist for the visual suite, which measures contrast
 * on what a browser actually painted rather than on the palette constants. They
 * are unit-tested here because a bug in them would make that suite quietly
 * score the wrong colours — a broken measuring tape reports no failures.
 */
describe('reading browser colours', () => {
  it('reads the legacy rgb() form Chromium returns', () => {
    expect(parseCssColor('rgb(22, 32, 44)')).toEqual({ rgb: [22, 32, 44], alpha: 1 });
  });

  it('reads rgba() with a fractional alpha', () => {
    expect(parseCssColor('rgba(0, 0, 0, 0.5)')).toEqual({ rgb: [0, 0, 0], alpha: 0.5 });
  });

  it('reads the modern space-separated form', () => {
    expect(parseCssColor('rgb(22 32 44 / 50%)')).toEqual({ rgb: [22, 32, 44], alpha: 0.5 });
  });

  it('treats the fully transparent value as zero alpha, not as black', () => {
    // getComputedStyle returns this for any element with no background, so
    // mistaking it for opaque black would invert every contrast measurement.
    expect(parseCssColor('rgba(0, 0, 0, 0)').alpha).toBe(0);
    expect(parseCssColor('transparent').alpha).toBe(0);
  });

  it('still reads hex', () => {
    expect(parseCssColor('#2a78d6')).toEqual({ rgb: parseHex('#2a78d6'), alpha: 1 });
  });

  it('feeds contrastRatio directly', () => {
    expect(contrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBeCloseTo(21, 5);
  });

  it('rejects a colour space it cannot measure rather than guessing', () => {
    expect(() => parseCssColor('oklch(62% 0.19 260)')).toThrow();
  });
});

describe('compositing translucent colours', () => {
  it('leaves an opaque colour alone', () => {
    expect(flatten({ rgb: [255, 0, 0], alpha: 1 }, [0, 0, 255])).toEqual([255, 0, 0]);
  });

  it('returns the backdrop when the colour is invisible', () => {
    expect(flatten({ rgb: [255, 0, 0], alpha: 0 }, [0, 0, 255])).toEqual([0, 0, 255]);
  });

  it('meets in the middle at half alpha', () => {
    expect(flatten({ rgb: [0, 0, 0], alpha: 0.5 }, [255, 255, 255])).toEqual([127.5, 127.5, 127.5]);
  });

  it('scores 50% black on white far below solid black', () => {
    // The reason alpha is kept out of parseCssColor's rgb: text at half opacity
    // is genuinely harder to read, and folding it in early would hide that.
    const faded = flatten({ rgb: [0, 0, 0], alpha: 0.5 }, [255, 255, 255]);
    expect(contrastRatio(faded, [255, 255, 255])).toBeLessThan(6);
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
  });
});

describe('palette resolution', () => {
  it('falls back to the default rather than throwing on a typo', () => {
    expect(resolvePalette('nonexistent')).toBe(PALETTES.default);
    expect(resolvePalette(undefined)).toBe(PALETTES.default);
  });

  it('passes a palette object through untouched', () => {
    const custom = { ...PALETTES.default, name: 'custom' };
    expect(resolvePalette(custom)).toBe(custom);
  });

  it('emits CSS variables, not literals, so host themes can override', () => {
    expect(seriesVar(0)).toBe('var(--ig-mark-1)');
    expect(seriesVar(1, 'ink')).toBe('var(--ig-ink-2)');
  });

  it('wraps around rather than running out of colours', () => {
    expect(seriesVar(3)).toBe(seriesVar(0));
  });
});
