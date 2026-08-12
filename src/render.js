/**
 * Finding authored figures, rendering them, and being able to undo it.
 *
 * The undo half is the part worth explaining. Rendering replaces the author's
 * markup with generated DOM, so the original has to be kept somewhere or the
 * operation is one-way — and one-way rendering breaks in three ordinary
 * situations: a Vite HMR update re-runs the plugin over already-rendered
 * output, reveal's overview/print modes re-enter `ready`, and a deck that calls
 * `render()` twice would nest figures inside figures.
 *
 * So every host element keeps its authored `innerHTML` in a WeakMap, and every
 * render starts by restoring it. This is the same contract `count-up.js` uses,
 * and it means the authored markup is always the source of truth — never the
 * DOM we last produced.
 */

import { resolveElementConfig } from './options.js';
import { getForm } from './forms/index.js';
import { recommendForm, checkEncoding } from './design/encode.js';
import { readItems } from './parse.js';
import { advise } from './warn.js';
import { cls } from './dom.js';

/** The attribute that marks an element as a figure to render. */
export const HOST_SELECTOR = '[data-infograph]';

/** @typedef {{ html: string, form: string }} HostState */

/** @type {WeakMap<Element, HostState>} */
const authored = new WeakMap();

/**
 * The config each figure was rendered with, including its own `data-ig-*`.
 *
 * Kept beside the figure rather than re-derived at animation time: the host
 * element is one level up and the figure is what the animation code holds, so
 * without this a `data-ig-duration` on one figure would silently lose to the
 * deck-wide value.
 *
 * @type {WeakMap<Element, import('./options.js').InfographConfig>}
 */
const figureConfigs = new WeakMap();

/**
 * @param {Element} figure
 * @param {import('./options.js').InfographConfig} fallback
 */
export function configFor(figure, fallback) {
  return figureConfigs.get(figure) ?? fallback;
}

/**
 * @param {Element|null|undefined} root
 * @returns {Element[]}
 */
export function hostsIn(root) {
  if (!root) return [];
  const found = [...root.querySelectorAll(HOST_SELECTOR)];
  if (root.matches?.(HOST_SELECTOR)) found.unshift(root);
  return found;
}

/**
 * Put a host element back the way the author wrote it.
 * @param {Element} host
 */
export function restore(host) {
  const state = authored.get(host);
  if (!state) return;
  host.innerHTML = state.html;
  host.classList.remove(cls('host'));
  // classList.remove leaves `class=""` behind, which is not what the author
  // wrote — and "restores exactly" is a promise this package makes.
  if (host.classList.length === 0) host.removeAttribute('class');
  host.removeAttribute('data-ig-rendered');
}

/**
 * Render one authored element in place.
 *
 * @param {Element} host
 * @param {import('./options.js').InfographConfig} config
 * @returns {HTMLElement|null} The figure, or null if nothing was rendered.
 */
export function renderHost(host, config) {
  restore(host);
  if (!authored.has(host)) authored.set(host, { html: host.innerHTML, form: '' });

  const data = /** @type {HTMLElement} */ (host).dataset;
  const requested = data.infograph ?? '';

  const name =
    requested === 'auto' || requested === ''
      ? recommendForm(data.intent, readItems(host, 'item').length, host)
      : requested;

  const form = getForm(name);
  if (!form) {
    advise(`unknown form "${name}"`, {
      element: host,
      hint: 'The authored markup is left as-is. Check data-infograph against the forms in the README.',
    });
    return null;
  }

  // Advisory only — checkEncoding never changes what gets drawn, so a figure
  // the author insisted on still renders exactly as asked.
  checkEncoding({ form: name, items: readItems(host, 'item'), config, host });

  const elementConfig = resolveElementConfig(host, config);
  const figure = form({ host, config: elementConfig, name });
  figureConfigs.set(figure, elementConfig);

  // Emptied only now: the form has already read everything it needs from the
  // authored children, and if it threw we would not have destroyed the source.
  host.replaceChildren(figure);
  host.classList.add(cls('host'));
  host.setAttribute('data-ig-rendered', name);
  /** @type {HostState} */ (authored.get(host)).form = name;

  return figure;
}

/**
 * Render every authored figure under `root`.
 *
 * Usable without reveal.js at all — this is the whole public surface for
 * embedding a figure in a page, and the entry point every test uses.
 *
 * @param {Element|Document|null|undefined} root
 * @param {import('./options.js').InfographConfig} config
 * @returns {HTMLElement[]} The figures produced.
 */
export function renderAll(root, config) {
  const scope = /** @type {Element} */ (
    root ?? (typeof document === 'undefined' ? null : document.body)
  );
  const figures = [];

  for (const host of hostsIn(scope)) {
    // One bad figure must not take the rest of the deck with it: a talk in
    // progress needs the other nineteen slides more than it needs this one.
    try {
      const figure = renderHost(host, config);
      if (figure) figures.push(figure);
    } catch (error) {
      advise(`failed to render ${/** @type {HTMLElement} */ (host).dataset.infograph}`, {
        element: host,
        hint: String(error),
      });
      restore(host);
    }
  }

  return figures;
}

/**
 * Test hook: forget cached authored markup.
 * @param {Element} host
 */
export function forget(host) {
  authored.delete(host);
}
