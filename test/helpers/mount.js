/**
 * The three-line path from authored markup to a rendered figure.
 *
 *   const figure = render('<div data-infograph="stat" data-value="43.8%"></div>');
 *   expect(text(figure, '.ig-stat-value')).toBe('43.8%');
 *
 * No reveal.js, no plugin lifecycle — just the render pipeline, which is where
 * every form's behaviour actually lives.
 */

import { renderAll } from '../../src/render.js';
import { resolveConfig } from '../../src/options.js';

/**
 * @param {string} html   Authored markup containing one `[data-infograph]`.
 * @param {Partial<import('../../src/options.js').InfographConfig>} [config]
 * @returns {HTMLElement}  The rendered figure.
 */
export function render(html, config) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);

  const figures = renderAll(host, resolveConfig(config));
  if (!figures.length) throw new Error('nothing rendered — is data-infograph set?');
  return figures[0];
}

/**
 * Render and keep the authored host element, for tests about re-rendering.
 * @param {string} html
 * @param {Partial<import('../../src/options.js').InfographConfig>} [config]
 */
export function renderWithHost(html, config) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.append(wrapper);

  const figures = renderAll(wrapper, resolveConfig(config));
  return {
    figure: figures[0],
    host: /** @type {HTMLElement} */ (wrapper.querySelector('[data-infograph]')),
    wrapper,
  };
}

/** @param {Element} root @param {string} selector */
export function text(root, selector) {
  return root.querySelector(selector)?.textContent?.trim() ?? null;
}

/** @param {Element} root @param {string} selector */
export function all(root, selector) {
  return [...root.querySelectorAll(selector)];
}

/** The messages `advise()` printed during this test. */
export function warnings() {
  const mock = /** @type {any} */ (console.warn);
  return (mock.mock?.calls ?? []).map((/** @type {any[]} */ call) => String(call[0]));
}
