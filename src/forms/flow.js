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
import { advise } from '../warn.js';

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

  /** @type {Element[]} */
  const nodes = [];

  items.forEach((item, i) => {
    if (i > 0) {
      // The connector is graphical only: a screen reader gets the steps in DOM
      // order, which already encodes the sequence.
      nodes.push(
        hideFromAt(
          el(
            'div',
            { class: cls('flow-arrow'), style: { '--ig-i': i } },
            el('span', { class: cls('flow-arrow-line') }),
            el('span', { class: cls('flow-arrow-head') }),
          ),
        ),
      );
    }

    nodes.push(
      el(
        'div',
        {
          class: [
            cls('flow-step'),
            fragment ? 'fragment' : '',
            item.emphasis ? cls('flow-step', 'on') : '',
          ],
          style: { '--ig-i': i },
          attrs: {
            'data-id': data.id ? `ig-${data.id}-step-${i}` : null,
            // fade-in-then-semi-out keeps earlier stages readable while the
            // next arrives: the reader needs the whole chain to follow it, not
            // just the newest link.
            'data-fragment-index': fragment ? i : null,
          },
        },
        item.label ? el('div', { class: cls('flow-step-label'), text: item.label }) : null,
        item.note ? el('div', { class: cls('flow-step-body'), text: item.note }) : null,
      ),
    );
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
