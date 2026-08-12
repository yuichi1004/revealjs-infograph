/**
 * The only place this package builds DOM.
 *
 * Everything goes through `el`/`svgEl` so that class prefixing, `null`-skipping
 * and attribute-vs-property handling are decided once. Forms then read as a
 * description of the figure rather than a sequence of createElement calls, and
 * tests can assert on structure without caring how it was assembled.
 */

/** Every class this package emits starts here, so host themes can scope safely. */
export const NS = 'ig';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @typedef {string|number|Node|null|undefined|false} Child
 */

/**
 * @typedef {object} Props
 * @property {string|string[]} [class] Class names; `ig-` is NOT auto-prefixed —
 *   pass `cls('waffle')` when you want the prefix, so a form can also apply a
 *   host theme's own class without fighting the helper.
 * @property {Record<string, string|number|boolean|null|undefined>} [attrs]
 * @property {Record<string, string|number|null|undefined>} [style]
 * @property {string} [text] Text content, set safely (never parsed as HTML).
 */

/**
 * Build a namespaced class name: `cls('waffle', 'cell')` → `'ig-waffle-cell'`.
 * @param {...string} parts
 */
export function cls(...parts) {
  return `${NS}-${parts.join('-')}`;
}

/**
 * @param {Element} node
 * @param {Props} props
 * @param {Child[]} children
 */
function fill(node, props, children) {
  const { class: className, attrs, style, text } = props;

  if (className) {
    const list = Array.isArray(className) ? className : [className];
    for (const name of list) {
      if (name) node.classList.add(name);
    }
  }

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      // `false` and nullish drop the attribute entirely rather than writing
      // "false" — otherwise `aria-hidden="false"` would hide nothing while
      // still being present, which is the classic version of this bug.
      if (value === null || value === undefined || value === false) continue;
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  if (style) {
    for (const [key, value] of Object.entries(style)) {
      if (value === null || value === undefined) continue;
      // setProperty (not .style.foo) so custom properties like `--ig-fill` work.
      /** @type {HTMLElement} */ (node).style.setProperty(key, String(value));
    }
  }

  if (text !== undefined) node.textContent = text;

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'object' ? child : String(child));
  }

  return node;
}

/**
 * @param {string} tag
 * @param {Props} [props]
 * @param {...Child} children
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, ...children) {
  return /** @type {HTMLElement} */ (fill(document.createElement(tag), props, children));
}

/**
 * @param {string} tag
 * @param {Props} [props]
 * @param {...Child} children
 * @returns {SVGElement}
 */
export function svgEl(tag, props = {}, ...children) {
  return /** @type {SVGElement} */ (fill(document.createElementNS(SVG_NS, tag), props, children));
}

/**
 * Text that only assistive technology sees.
 *
 * Used for the tabular fallback every figure carries (see a11y.js). Styled
 * inline rather than by class so the fallback keeps working even if a deck
 * forgets to load styles/infograph.css — an unstyled figure is a cosmetic
 * problem, an unstyled visually-hidden block is a wall of duplicated numbers in
 * the middle of the slide.
 *
 * @param {Child[]} children
 */
export function visuallyHidden(...children) {
  return el(
    'div',
    {
      class: cls('sr-only'),
      style: {
        position: 'absolute',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        clip: 'rect(1px, 1px, 1px, 1px)',
        'clip-path': 'inset(50%)',
        'white-space': 'nowrap',
      },
    },
    ...children,
  );
}
