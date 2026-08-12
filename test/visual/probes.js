/**
 * Measurements taken inside the browser.
 *
 * Every function here is serialised into the page by `page.evaluate`, so each
 * one must be self-contained — no imports, no closure over module scope. They
 * return plain JSON that the specs then reason about in Node, where the
 * package's own `src/design/contrast.js` does the colour arithmetic. That
 * division is deliberate: the browser is asked only what it painted, and the
 * judgement about whether that is acceptable is made by the same code the
 * package ships to decks.
 *
 * These read layout, not pixels. `getBoundingClientRect` and
 * `document.elementFromPoint` answer "where is it" and "what is on top here"
 * exactly, with no decoding, no tolerance, and no dependency — and clip-path,
 * transforms and overflow all affect hit testing, so the questions this suite
 * actually asks are answerable without ever looking at a colour buffer.
 */

/**
 * @typedef {object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
 */

/**
 * Rectangles for every element matching `selector`, in document order.
 *
 * @param {[string, string]} args `[rootSelector, selector]`
 * @returns {Rect[]}
 */
export function rectsOf([rootSelector, selector]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);
  return [...root.querySelectorAll(selector)].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
    };
  });
}

/**
 * Computed values for every element matching `selector`.
 *
 * @param {[string, string, string[]]} args `[rootSelector, selector, properties]`
 * @returns {Array<Record<string, string>>}
 */
export function stylesOf([rootSelector, selector, properties]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);
  return [...root.querySelectorAll(selector)].map((el) => {
    const computed = getComputedStyle(el);
    /** @type {Record<string, string>} */
    const out = {};
    for (const property of properties) out[property] = computed.getPropertyValue(property);
    return out;
  });
}

/**
 * The effective foreground and background of every text-bearing element.
 *
 * "Effective background" is the part that needs care. An element usually has
 * `background-color: rgba(0,0,0,0)`, so the colour a reader actually sees comes
 * from an ancestor — and possibly from several, if any of them are translucent.
 * This walks up collecting layers until it hits an opaque one, then hands the
 * stack back for compositing in Node.
 *
 * Elements are skipped unless they hold text directly: a wrapper div inherits a
 * colour it never paints, and scoring it would just multiply the same result.
 *
 * @param {[string]} args `[rootSelector]`
 * @returns {Array<{ selector: string, text: string, color: string, layers: string[],
 *                   fontSize: number, fontWeight: number, opacity: number }>}
 */
export function textColorsOf([rootSelector]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);

  /** @param {Element} el */
  const describe = (el) => {
    const parts = [el.tagName.toLowerCase()];
    if (el.classList.length) parts.push(...[...el.classList].map((c) => `.${c}`));
    return parts.join('');
  };

  /** @param {Element} el */
  const hasOwnText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '');

  /** @param {Element} el */
  const isVisible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const results = [];

  for (const el of root.querySelectorAll('*')) {
    if (!hasOwnText(el) || !isVisible(el)) continue;
    // Content hidden from assistive tech is still seen, so it is still checked;
    // content hidden from sight (the tabular fallback) is not, and isVisible
    // has already dropped it.

    const computed = getComputedStyle(el);

    /** @type {string[]} */
    const layers = [];
    for (let node = el; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor;
      if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') continue;
      layers.push(background);
      // An opaque layer hides everything behind it; stop there.
      if (!/^rgba\(/.test(background) || /,\s*1\)$/.test(background)) break;
    }
    // Nothing opaque found up the tree: the canvas shows through.
    layers.push(getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)');

    results.push({
      selector: describe(el),
      text: (el.textContent ?? '').trim().slice(0, 40),
      color: computed.color,
      layers,
      fontSize: parseFloat(computed.fontSize),
      fontWeight: Number(computed.fontWeight) || 400,
      opacity: Number(computed.opacity),
    });
  }

  return results;
}

/**
 * What is painted at a point, expressed as the topmost element's classes.
 *
 * The load-bearing check for venn: `clip-path` participates in hit testing, so
 * if the lens stops being a clipped intersection this stops returning the lens
 * class at the point where the two circles overlap. No pixel decoding needed.
 *
 * Coordinates are given as fractions of the named element's box so a spec never
 * hard-codes a viewport position.
 *
 * @param {[string, number, number]} args `[selector, fx, fy]` fractions 0–1
 * @returns {{ tag: string, classes: string[] }|null}
 */
export function elementAtFraction([selector, fx, fy]) {
  const target = document.querySelector(selector);
  if (!target) throw new Error(`no element matches ${selector}`);

  // elementFromPoint takes *viewport* coordinates and returns null for anything
  // outside them. The fixture is a tall page, so a figure near the bottom is
  // off-screen and every sample of it would come back null — which reads as
  // "nothing is painted there" and would fail the geometry checks for a reason
  // that has nothing to do with the geometry.
  target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });

  const r = target.getBoundingClientRect();
  const x = r.left + r.width * fx;
  const y = r.top + r.height * fy;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
    throw new Error(`sample point (${x.toFixed(0)}, ${y.toFixed(0)}) is outside the viewport`);
  }

  const found = document.elementFromPoint(x, y);
  if (!found) return null;
  return { tag: found.tagName.toLowerCase(), classes: [...found.classList] };
}

/**
 * Elements whose content is wider or taller than the box they were given.
 *
 * A clipped label is the most common way a figure silently stops communicating,
 * and it is invisible to a DOM test: the text is present, correct and
 * unreachable. The +1 absorbs sub-pixel rounding, which browsers do routinely
 * on fractional layout.
 *
 * @param {[string]} args `[rootSelector]`
 * @returns {Array<{ selector: string, text: string, scrollWidth: number, clientWidth: number }>}
 */
export function overflowingIn([rootSelector]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);

  const out = [];
  for (const el of root.querySelectorAll('*')) {
    const computed = getComputedStyle(el);
    if (computed.display === 'none' || computed.visibility === 'hidden') continue;
    // Elements that were told to scroll or hide are doing it on purpose.
    if (computed.overflowX !== 'visible' || computed.overflowY !== 'visible') continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      out.push({
        selector: el.tagName.toLowerCase() + [...el.classList].map((c) => `.${c}`).join(''),
        text: (el.textContent ?? '').trim().slice(0, 40),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
  }
  return out;
}

/**
 * Pairs of visible text elements whose boxes overlap.
 *
 * Only leaf text elements are compared: an ancestor always contains its
 * descendants, so including them would report every nesting as a collision.
 *
 * @param {[string]} args `[rootSelector]`
 * @returns {Array<{ a: string, b: string, overlap: number }>}
 */
export function textCollisionsIn([rootSelector]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);

  const leaves = [...root.querySelectorAll('*')].filter((el) => {
    const computed = getComputedStyle(el);
    if (computed.display === 'none' || computed.visibility === 'hidden') return false;
    if (!(el.textContent ?? '').trim()) return false;
    if (el.querySelector('*')) return false; // not a leaf
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  const label = (/** @type {Element} */ el) =>
    `${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join('')}` +
    `("${(el.textContent ?? '').trim().slice(0, 20)}")`;

  const out = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i].getBoundingClientRect();
      const b = leaves[j].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      // A 1px tolerance: adjacent inline boxes routinely share an edge.
      if (w > 1 && h > 1) {
        out.push({ a: label(leaves[i]), b: label(leaves[j]), overlap: Math.round(w * h) });
      }
    }
  }
  return out;
}

/**
 * Whether an element is actually painted as a pictogram.
 *
 * Distinct from "the CSS says mask-image": this reads the computed value, so it
 * fails if the custom property never resolved — the exact failure mode that hid
 * for a whole afternoon when `--ig-*` tokens turned out to be scoped to
 * `.reveal` and every colour silently fell through to nothing.
 *
 * @param {[string, string]} args `[rootSelector, selector]`
 * @returns {Array<{ masked: boolean, value: string }>}
 */
export function masksOf([rootSelector, selector]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);

  return [...root.querySelectorAll(selector)].map((el) => {
    const computed = getComputedStyle(el);
    const value = computed.maskImage || computed.webkitMaskImage || 'none';
    return { masked: value !== 'none' && value.includes('data:image/svg+xml'), value };
  });
}

/**
 * Decoration that this package claims not to emit.
 *
 * @param {[string]} args `[rootSelector]`
 * @returns {Array<{ selector: string, property: string, value: string }>}
 */
export function decorationIn([rootSelector]) {
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error(`no element matches ${rootSelector}`);

  /*
   * Elements allowed to carry a pictogram mask.
   *
   * A silhouette is only legitimate when it *is* the mark — one repeated symbol
   * standing for one unit. The same mask on a container, a label or a figure
   * background would be exactly the ornament principle 5 rules out, so the
   * allowance is granted per class rather than for `mask-image` generally, and
   * widening it has to be a deliberate, reviewable edit.
   *
   * Declared inside the function because this whole file is serialised into the
   * page by `page.evaluate` — a module-scope const is not in scope there, and
   * the probe throws rather than silently passing.
   */
  const markClasses = ['ig-waffle-cell', 'ig-bar-glyph'];

  const out = [];
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const computed = getComputedStyle(el);
    const selector = el.tagName.toLowerCase() + [...el.classList].map((c) => `.${c}`).join('');

    if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      out.push({ selector, property: 'background-image', value: computed.backgroundImage });
    }

    // A mask is how a pictogram mark gets its shape. On anything that is not a
    // mark, it is a picture laid over the figure.
    const mask = computed.maskImage || computed.webkitMaskImage;
    const isMark = markClasses.some((name) => el.classList.contains(name));
    if (mask && mask !== 'none' && !isMark) {
      out.push({ selector, property: 'mask-image', value: mask });
    }
    if (computed.textShadow && computed.textShadow !== 'none') {
      out.push({ selector, property: 'text-shadow', value: computed.textShadow });
    }
    // `inset 0 0 0 1px` is a hairline, not a drop shadow — it is how the waffle
    // draws cell edges without spending a border box. Only blurred or offset
    // shadows are decoration.
    //
    // The four lengths are x-offset, y-offset, blur, spread — in that order.
    // Only index 2 is blur; index 3 is the spread that makes the hairline, so
    // testing `i >= 2` flags every hairline as a glow.
    if (computed.boxShadow && computed.boxShadow !== 'none') {
      const lengths = [...computed.boxShadow.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
      const blurred = (lengths[2] ?? 0) > 0;
      const offset = lengths.slice(0, 2).some((n) => Math.abs(n) > 1);
      if (blurred || offset) {
        out.push({ selector, property: 'box-shadow', value: computed.boxShadow });
      }
    }
  }
  return out;
}
