/**
 * venn — two ideas and the thing that exists only where they meet.
 *
 *   <div data-infograph="venn" data-overlap="0.35"
 *        data-a="In-house development" data-b="Globalization"
 *        data-ab="Culture integration"></div>
 *
 * This is the one form where area is the right encoding, because area *is* the
 * message: the claim "these two overlap" is topological, not quantitative. Set
 * against that, the accuracy ranking has nothing to say — there is no magnitude
 * being judged.
 *
 * The intersection is a real clipped lens, not a third circle floated on top.
 * The reference deck drew it the second way and it is subtly wrong: the shape
 * says "a third category adjacent to the other two" where the argument says
 * "the part they share". A reader who notices does not know which one to trust.
 *
 * Labels are placed under their own circle, at the circle's own x position, so
 * the label moves when the geometry does. Nothing here needs a legend.
 */

import { el, svgEl, cls } from '../dom.js';
import { figure, hideFromAt } from '../a11y.js';
import { VENN, centerDistance } from '../design/tokens.js';
import { advise } from '../warn.js';

let uid = 0;

/** @type {import('./index.js').Form} */
export default function venn({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;

  const labelA = data.a ?? '';
  const labelB = data.b ?? '';
  const labelAB = data.ab ?? '';

  if (!labelA || !labelB) {
    advise('venn needs both data-a and data-b', {
      element: host,
      hint: 'Unlabelled circles are a shape, not an argument. Name each set.',
    });
  }
  if (data.c) {
    advise('venn draws two sets; data-c was ignored', {
      element: host,
      hint: 'Three overlapping circles have seven regions, which is past what an audience will decode mid-talk. Two figures usually say it better.',
    });
  }

  const overlap = clamp01(Number(data.overlap ?? 0.35));
  const r = VENN.radius;
  const distance = centerDistance(r, overlap);
  const cxA = VENN.width / 2 - distance / 2;
  const cxB = VENN.width / 2 + distance / 2;
  const cy = VENN.centerY;

  const clipId = `ig-venn-clip-${++uid}`;

  const svg = svgEl(
    'svg',
    {
      class: cls('venn-svg'),
      attrs: {
        viewBox: `0 0 ${VENN.width} ${VENN.height}`,
        // No width/height attributes: the CSS sizes it and the viewBox scales
        // it, so the same markup works at any deck resolution.
        preserveAspectRatio: 'xMidYMid meet',
        role: 'presentation',
      },
    },
    svgEl(
      'defs',
      {},
      svgEl('clipPath', { attrs: { id: clipId } }, svgEl('circle', { attrs: { cx: cxB, cy, r } })),
    ),
    svgEl('circle', {
      class: [cls('venn-circle'), cls('venn-circle', 'a')],
      attrs: { cx: cxA, cy, r },
      style: { '--ig-i': 0 },
    }),
    svgEl('circle', {
      class: [cls('venn-circle'), cls('venn-circle', 'b')],
      attrs: { cx: cxB, cy, r },
      style: { '--ig-i': 1 },
    }),
    // The lens: circle A clipped to circle B. Exactly the shared region, by
    // construction, at any overlap.
    labelAB || overlap > 0
      ? svgEl('circle', {
          class: [cls('venn-circle'), cls('venn-circle', 'ab')],
          attrs: { cx: cxA, cy, r, 'clip-path': `url(#${clipId})` },
          style: { '--ig-i': 2 },
        })
      : null,
  );

  const labels = el(
    'div',
    { class: cls('venn-labels') },
    labelA ? label(labelA, pct(cxA), 'a') : null,
    labelB ? label(labelB, pct(cxB), 'b') : null,
    labelAB ? label(labelAB, pct((cxA + cxB) / 2), 'ab') : null,
  );

  const visual = el(
    'div',
    { class: cls('venn'), style: { '--ig-venn-ratio': `${VENN.width} / ${VENN.height}` } },
    hideFromAt(svg),
    labels,
  );

  return figure({
    form: 'venn',
    label:
      data.label ??
      (labelAB
        ? `Overlap between ${labelA} and ${labelB}: ${labelAB}`
        : `Overlap between ${labelA} and ${labelB}`),
    visual,
    caption: data.caption,
  });
}

/**
 * @param {string} text
 * @param {number} x  Horizontal centre, as a percentage of the figure width.
 * @param {'a'|'b'|'ab'} role
 */
function label(text, x, role) {
  return el('span', {
    class: [cls('venn-label'), cls('venn-label', role)],
    style: { '--ig-venn-x': `${x}%` },
    text,
  });
}

/** @param {number} x */
function pct(x) {
  return (x / VENN.width) * 100;
}

/** @param {number} n */
function clamp01(n) {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.35;
}
