#!/usr/bin/env node
/**
 * Print the palette audit as a table.
 *
 * Same code path as test/palette.test.js — the test asserts, this explains.
 * Run it after touching any colour in src/design/palette.js.
 *
 *   npm run validate:palette
 *   npm run validate:palette -- default
 */

import { PALETTES, auditPalette, THRESHOLDS } from '../src/design/palette.js';
import { separation, contrastRatio } from '../src/design/contrast.js';

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(PALETTES);

let failed = false;

for (const name of names) {
  const palette = PALETTES[name];
  if (!palette) {
    console.error(`unknown palette: ${name}`);
    failed = true;
    continue;
  }

  console.log(`\n${palette.name} — ${palette.description}`);
  console.log(`surface ${palette.surface}   muted ${palette.muted}\n`);

  const { pass, checks } = auditPalette(palette);
  const rows = checks.map((c) => ({
    check: c.label,
    metric: c.metric,
    value: c.value.toFixed(2),
    min: c.min.toFixed(2),
    result: c.pass ? 'PASS' : 'FAIL',
  }));
  console.table(rows);

  // The per-deficiency breakdown is not asserted (the worst case is), but it is
  // what tells you *which* kind of colour vision a failing pair is failing for.
  console.log('ΔE2000 by vision type:');
  for (let i = 0; i < palette.marks.length; i++) {
    for (let j = i + 1; j < palette.marks.length; j++) {
      const s = separation(palette.marks[i], palette.marks[j]);
      console.log(
        `  ${palette.marks[i]} ↔ ${palette.marks[j]}  ` +
          `normal ${s.normal.toFixed(1)}  protan ${s.protan.toFixed(1)}  ` +
          `deutan ${s.deutan.toFixed(1)}  tritan ${s.tritan.toFixed(1)}`,
      );
    }
  }

  console.log('\nMark contrast vs surface (mark-only colours may sit below 4.5:1');
  console.log('because every form direct-labels its marks — see palette.js):');
  for (const mark of palette.marks) {
    console.log(`  ${mark}  ${contrastRatio(mark, palette.surface).toFixed(2)}:1`);
  }

  console.log(`\n${palette.name}: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) failed = true;
}

console.log(`\nthresholds: ${JSON.stringify(THRESHOLDS)}`);
process.exit(failed ? 1 : 0);
