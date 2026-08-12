/**
 * cycle — a process that repeats, arranged in a ring.
 *
 *   <div data-infograph="cycle">
 *     <ul>
 *       <li>Plan</li>
 *       <li>Do</li>
 *       <li>Check</li>
 *       <li>Act</li>
 *     </ul>
 *   </div>
 *
 * First stage sits at the top; the rest proceed clockwise and the last one
 * closes back to the first. That closure is the entire reason this is a
 * separate form from `flow`: a straight sequence ends, a cycle doesn't, and a
 * reader has to be told which one they're looking at.
 *
 * The connectors are real SVG arcs along the ring, not straight lines between
 * stages. Straight chords are simpler to draw, but for four stages they trace
 * a rhombus — the shape a reader would call "arrows between some boxes," not
 * "a cycle." The arc is what actually delivers the shape the form is named
 * for, at the cost of being the one curve this package draws (`venn` draws
 * circles and a clip; nothing here has drawn a directional curve before).
 *
 * Arrowheads use an SVG `<marker>` with `orient="auto"`, which tracks the
 * tangent of the curve at its endpoint on its own — the alternative is to
 * compute that angle by hand for every arc, which a marker makes unnecessary.
 *
 * Connectors are chrome, not a mark, the same rule `flow`'s arrows already
 * follow: they state structure, not data, so they stay one neutral colour
 * regardless of `data-emphasis`. Labels sit outside the ring — this form is
 * built for short stage names (a word or two); nothing here wraps or shrinks
 * text that doesn't fit, the same limitation `pyramid`'s narrow apex has.
 */

import { el, svgEl, cls } from '../dom.js';
import { figure, hideFromAt } from '../a11y.js';
import { readItems, applyEmphasis } from '../parse.js';
import { checkIcons } from '../icon.js';
import { CYCLE } from '../design/tokens.js';
import { advise } from '../warn.js';

/** How far an arc is trimmed from each end, so it clears the node it meets and
 * leaves room for the arrowhead. Scaled to the gap between stages rather than
 * fixed, so it never eats more than half of a short arc at a high stage count. */
const MAX_INSET_DEG = 14;

/** Past this many stages a ring reads as texture, not a sequence — well before
 * `maxSeries`'s four applies, since these are read one at a time around the
 * circle rather than held in mind simultaneously while decoding a chart. */
const MAX_STAGES = 8;

let uid = 0;

/** @type {import('./index.js').Form} */
export default function cycle({ host }) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const items = applyEmphasis(readItems(host, 'stage'), data.emphasis, host);

  if (items.length < 2) {
    advise('cycle needs at least two stages', {
      element: host,
      hint: 'A single stage has nothing to cycle through — a stat says it with less furniture.',
    });
  }

  if (items.length > MAX_STAGES) {
    advise(
      `cycle has ${items.length} stages; more than ${MAX_STAGES} reads as texture, not a sequence`,
      {
        element: host,
        hint: 'Group related stages together, or split across slides.',
      },
    );
  }

  checkIcons(items, host, 'cycle stage');

  const n = items.length || 1;
  const step = 360 / n;
  const inset = Math.min(MAX_INSET_DEG, step / 4);
  const anyEmphasis = items.some((item) => item.emphasis);
  const anyIcon = items.some((item) => item.icon);
  const labelRadius = anyIcon ? CYCLE.labelRadiusIcon : CYCLE.labelRadius;
  const arrowId = `ig-cycle-arrow-${++uid}`;

  const marker = svgEl(
    'marker',
    {
      attrs: {
        id: arrowId,
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        markerUnits: 'userSpaceOnUse',
        orient: 'auto',
      },
    },
    svgEl('path', { class: cls('cycle-arrow-head'), attrs: { d: 'M0,0 L10,5 L0,10 z' } }),
  );

  const arrows = items.map((_, i) => {
    const start = angle(i, n);
    const end = start + step;
    const [x1, y1] = point(start + inset, CYCLE.radius);
    const [x2, y2] = point(end - inset, CYCLE.radius);

    return svgEl('path', {
      class: cls('cycle-arrow'),
      attrs: {
        d: `M${x1},${y1} A${CYCLE.radius},${CYCLE.radius} 0 0 1 ${x2},${y2}`,
        'marker-end': `url(#${arrowId})`,
      },
    });
  });

  const nodes = items.map((item, i) => {
    const [cx, cy] = point(angle(i, n), CYCLE.radius);
    return svgEl('circle', {
      class: cls('cycle-node'),
      attrs: { cx, cy, r: CYCLE.nodeRadius },
      style: {
        '--ig-i': i,
        '--ig-cycle-fill': anyEmphasis && !item.emphasis ? 'var(--ig-muted)' : 'var(--ig-mark-1)',
      },
    });
  });

  const svg = svgEl(
    'svg',
    {
      class: cls('cycle-svg'),
      attrs: {
        viewBox: `0 0 ${CYCLE.width} ${CYCLE.height}`,
        preserveAspectRatio: 'xMidYMid meet',
        role: 'presentation',
      },
    },
    svgEl('defs', {}, marker),
    ...arrows,
    ...nodes,
  );

  const labels = el(
    'div',
    { class: cls('cycle-labels') },
    ...items.map((item, i) => {
      const [x, y] = point(angle(i, n), labelRadius);
      const classes = [cls('cycle-label'), item.emphasis ? cls('cycle-label', 'on') : ''];
      const style = {
        '--ig-i': i,
        '--ig-cycle-x': `${pct(x, CYCLE.width)}%`,
        '--ig-cycle-y': `${pct(y, CYCLE.height)}%`,
      };

      // Icon and text split into two children only when there's an icon to
      // place — with none, this stays the exact single-span markup the form
      // has always emitted, so a plain cycle's baseline does not move.
      if (item.icon) {
        return el(
          'span',
          { class: [...classes, cls('cycle-label', 'iconed')], style },
          item.icon,
          el('span', { class: cls('cycle-label-text'), text: item.label }),
        );
      }

      return el('span', { class: classes, style, text: item.label });
    }),
  );

  const visual = el(
    'div',
    { class: cls('cycle'), style: { '--ig-cycle-ratio': `${CYCLE.width} / ${CYCLE.height}` } },
    hideFromAt(svg),
    labels,
  );

  // States the closure explicitly. A plain "A → B → C" reads correctly for
  // flow's straight sequence; for a cycle, nothing about reading the labels
  // left to right conveys that the last one leads back to the first, so the
  // accessible name says so directly — and it's literally true, not merely an
  // accessibility workaround.
  const names = items.map((item) => item.label).filter(Boolean);
  const closedLoop = names.length ? [...names, names[0]].join(' → ') : '';

  return figure({
    form: 'cycle',
    label: data.label ?? closedLoop,
    visual,
    // No hidden table: the labels are already real text, in order, and the
    // derived name states the one thing the visible arrows add — the loop.
    caption: data.caption,
  });
}

/**
 * A stage's angle, in degrees. 0 is the top, and it increases clockwise —
 * SVG's y-down coordinate space means an increasing angle used directly with
 * cos/sin already rotates clockwise on screen, with no sign-flipping needed.
 *
 * @param {number} i     0-based stage index.
 * @param {number} n     Total stages.
 */
function angle(i, n) {
  return -90 + i * (360 / n);
}

/**
 * A point on the ring at a given angle and radius, in CYCLE's user units.
 * @param {number} deg
 * @param {number} radius
 */
function point(deg, radius) {
  const rad = (deg * Math.PI) / 180;
  return [
    Math.round((CYCLE.centerX + radius * Math.cos(rad)) * 100) / 100,
    Math.round((CYCLE.centerY + radius * Math.sin(rad)) * 100) / 100,
  ];
}

/**
 * A user-unit coordinate as a percentage of the canvas's own dimension —
 * venn's `pct()` extended from one axis to either.
 * @param {number} value
 * @param {number} total
 */
function pct(value, total) {
  return (value / total) * 100;
}
