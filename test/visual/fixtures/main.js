/*
 * Renders every case from ../cases.js onto a plain page — no reveal.js.
 *
 * Two reasons the fixture is not just the playground deck:
 *
 * 1. reveal scales its whole canvas with a CSS transform, so every
 *    getBoundingClientRect() comes back multiplied by a factor that depends on
 *    the viewport. Assertions about "the bars share a left edge to within 1px"
 *    would be measuring reveal's arithmetic as much as ours.
 * 2. A figure that fails here has one cause. A figure that fails inside a deck
 *    could be the deck's layout. The reveal-specific behaviour gets its own
 *    spec (integration.spec.js) against the real playground.
 *
 * Fonts are pinned to Inter and the page announces `data-state="ready"` only
 * after `document.fonts.ready`, so no spec can measure a fallback face.
 */

import '@fontsource-variable/inter';
import { renderAll, resolveConfig } from '../../../src/index.js';
import '../../../styles/infograph.css';
import './fixture.css';
import { CASES } from '../cases.js';

const root = /** @type {HTMLElement} */ (document.getElementById('cases'));

for (const testCase of CASES) {
  const section = document.createElement('section');
  section.className = 'case';
  section.id = `case-${testCase.id}`;
  section.dataset.case = testCase.id;

  const title = document.createElement('h2');
  title.className = 'case-title';
  title.textContent = testCase.title;

  // The figure gets its own bounded box so a spec can ask "did this overflow
  // its container" and mean something by it.
  const stage = document.createElement('div');
  stage.className = 'case-stage';
  stage.dataset.stage = testCase.id;
  stage.innerHTML = testCase.html;

  section.append(title, stage);
  root.append(section);
}

// Config left at defaults on purpose: the suite should be checking what a deck
// gets out of the box, not a tuned configuration.
renderAll(root, resolveConfig());

await document.fonts.ready;
root.dataset.state = 'ready';
