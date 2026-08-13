/**
 * flow — ordered stages, with the ordering made explicit.
 *
 *   <div data-infograph="flow" data-ig-fragment="steps">
 *     <div data-step="Problem">Fragmented teams</div>
 *     <div data-step="Intervention">Culture integration</div>
 *     <div data-step="Result">+43.8%</div>
 *   </div>
 *
 * Three things this form is doing, none of them decorative:
 *
 * Explicit connectors. Boxes in a row are read as a *group* (Gestalt proximity)
 * unless something states direction. An arrow between them is the cheapest
 * possible statement of "this causes that", and without it a reader has to
 * infer sequence from left-to-right convention alone.
 *
 * Common region. Each stage is one bordered card, so its label and its body
 * belong together visually before either is read. That is what stops the eye
 * from pairing a label with the wrong body when the text lengths differ.
 *
 * Optional segmentation. `data-ig-fragment="steps"` turns each stage into a
 * reveal fragment, so the diagram arrives one stage at a time, at the speaker's
 * pace. The segmenting principle is one of the better-replicated results in
 * multimedia learning: the same material, delivered in learner-paced segments,
 * is understood better than the same material delivered whole.
 */

import { el, cls } from '../dom.js';
import { figure, hideFromAt } from '../a11y.js';
import { readItems } from '../parse.js';
import { checkIcons } from '../icon.js';
import { advise } from '../warn.js';

/**
 * Past this many steps a left-to-right chain reads as a list to scan, not a
 * story to follow — the same "one step at a time" sequential-recall reasoning
 * `MAX_TIERS` (src/forms/pyramid.js) and `MAX_STAGES` (src/forms/cycle.js)
 * already apply, not `maxSeries` (that one is about a bar chart's series,
 * which sit on screen at once — see checkEncoding() in src/design/encode.js).
 */
const MAX_STEPS = 8;

/** @type {import('./index.js').Form} */
export default function flow({ host, config }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const items = readItems(host, 'step');
  const fragment = data.igFragment === 'steps' || data.igFragment === '';

  if (items.length < 2) {
    advise('flow needs at least two steps', {
      element: host,
      hint: 'A single stage is not a sequence — a stat or a plain sentence says it with less furniture.',
    });
  }

  if (items.length > MAX_STEPS) {
    advise(
      `flow has ${items.length} steps; more than ${MAX_STEPS} is hard to follow as one chain`,
      {
        element: host,
        hint: 'Group related steps together, or split across slides.',
      },
    );
  }

  checkIcons(items, host, 'flow step');

  /** @type {Element[]} */
  const nodes = [];

  items.forEach((item, i) => {
    const step = el(
      'div',
      {
        class: [
          cls('flow-step'),
          fragment ? 'fragment' : '',
          item.emphasis ? cls('flow-step', 'on') : '',
        ],
        attrs: {
          'data-id': data.id ? `ig-${data.id}-step-${i}` : null,
          // fade-in-then-semi-out keeps earlier stages readable while the
          // next arrives: the reader needs the whole chain to follow it, not
          // just the newest link.
          'data-fragment-index': fragment ? i : null,
        },
      },
      item.icon,
      item.label ? el('div', { class: cls('flow-step-label'), text: item.label }) : null,
      item.note ? el('div', { class: cls('flow-step-body'), text: item.note }) : null,
    );

    if (i === 0) {
      // The first step has no connector before it, so nothing needs to be
      // kept together with it — it stays a bare flex child, exactly as before.
      step.style.setProperty('--ig-i', String(i));
      nodes.push(step);
      return;
    }

    // The connector and the step it introduces are wrapped in one flex item,
    // never two — flex-wrap only ever wraps at item boundaries, so this is
    // what stops an arrow from being stranded at the end of a row while the
    // step it points to starts the next one. `--ig-i` is set once on the
    // wrapper and inherited by both children, so they still animate in
    // together as they did when they were separate top-level items.
    const arrow = hideFromAt(
      el(
        'div',
        { class: cls('flow-arrow') },
        el('span', { class: cls('flow-arrow-line') }),
        el('span', { class: cls('flow-arrow-head') }),
      ),
    );

    const unit = el('div', { class: cls('flow-unit'), style: { '--ig-i': i } }, arrow, step);
    nodes.push(unit);
  });

  const visual = el(
    'div',
    { class: [cls('flow'), config.density === 'compact' ? cls('flow', 'compact') : ''] },
    ...nodes,
  );

  return figure({
    form: 'flow',
    label:
      data.label ??
      items
        .map((item) => item.label || item.note)
        .filter(Boolean)
        .join(' → '),
    visual,
    caption: data.caption,
  });
}
