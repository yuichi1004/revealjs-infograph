/**
 * Making a figure mean the same thing to someone who cannot see it.
 *
 * The naive options are both wrong:
 *
 *   `role="img"` on the whole figure  — hides the direct labels, so the reader
 *      gets one aria-label summary and no access to the individual values.
 *   nothing at all  — the reader gets the marks' text in DOM order, which for a
 *      waffle is a hundred empty cells and for a bar chart is a pile of numbers
 *      with no stated relationship to their labels.
 *
 * So: the *graphical* layer (cells, bars, circles, connectors) is hidden from
 * assistive tech, the text labels stay in the accessible tree where they are
 * already meaningful, and any form whose meaning lives in the geometry carries
 * a visually-hidden table stating the same numbers in reading order.
 *
 * The figure itself is a `<figure>` with an accessible name, so a reader can
 * skip it as one unit instead of walking through it.
 */

import { el, cls, visuallyHidden } from './dom.js';

/**
 * Hide a purely graphical node from assistive technology.
 *
 * `focusable="false"` matters for SVG: IE/older Edge put SVG elements in the
 * tab order regardless of aria-hidden, producing focus stops on invisible
 * shapes. It costs one attribute to not have that conversation.
 *
 * @template {Element} T
 * @param {T} node
 * @returns {T}
 */
export function hideFromAt(node) {
  node.setAttribute('aria-hidden', 'true');
  if (node.namespaceURI === 'http://www.w3.org/2000/svg') node.setAttribute('focusable', 'false');
  return node;
}

/**
 * A visually-hidden table stating a figure's numbers.
 *
 * @param {object} spec
 * @param {string} spec.caption
 * @param {string[]} spec.columns
 * @param {Array<Array<string>>} spec.rows
 * @returns {HTMLElement}
 */
export function dataTable({ caption, columns, rows }) {
  return visuallyHidden(
    el(
      'table',
      { class: cls('table') },
      el('caption', { text: caption }),
      el(
        'thead',
        {},
        el('tr', {}, ...columns.map((c) => el('th', { attrs: { scope: 'col' }, text: c }))),
      ),
      el(
        'tbody',
        {},
        ...rows.map((row) =>
          el(
            'tr',
            {},
            // First cell is the row header: that is what pairs a value with its
            // label when a screen reader announces the cell.
            ...row.map((cell, i) =>
              i === 0
                ? el('th', { attrs: { scope: 'row' }, text: cell })
                : el('td', { text: cell }),
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * Wrap a form's output in the standard figure shell.
 *
 * @param {object} spec
 * @param {string} spec.form         Form name, for the modifier class.
 * @param {string} spec.label        Accessible name for the whole figure.
 * @param {Node} spec.visual         The graphical + label layer.
 * @param {Node|null} [spec.table]   Hidden tabular fallback, when geometry carries meaning.
 * @param {string} [spec.caption]    Visible caption, printed under the figure.
 * @returns {HTMLElement}
 */
export function figure({ form, label, visual, table, caption }) {
  return el(
    'figure',
    {
      class: [cls('figure'), cls('figure', form)],
      attrs: { 'aria-label': label || null, 'data-ig-form': form },
    },
    visual,
    table ?? null,
    caption ? el('figcaption', { class: cls('caption'), text: caption }) : null,
  );
}
