/**
 * The form registry.
 *
 * A form is a pure function `(context) => HTMLElement`. It reads only what it
 * is given, touches no globals, and returns a detached node — which is what
 * makes every form testable with three lines and no reveal.js.
 *
 * `registerForm` is the extension point: a deck with a figure this package does
 * not cover writes its own renderer and gets the same lifecycle, animation,
 * accessibility shell and config resolution as the built-ins.
 */

import stat from './stat.js';
import waffle from './waffle.js';
import bar from './bar.js';
import flow from './flow.js';
import compare from './compare.js';
import venn from './venn.js';
import pyramid from './pyramid.js';
import cycle from './cycle.js';
import quadrant from './quadrant.js';

/**
 * @typedef {object} FormContext
 * @property {Element} host        The authored element (read attributes from here).
 * @property {import('../options.js').InfographConfig} config  Resolved for this figure.
 * @property {string} name         The form's own name.
 */

/**
 * @typedef {(context: FormContext) => HTMLElement} Form
 */

/** @type {Map<string, Form>} */
const registry = new Map(
  Object.entries({ stat, waffle, bar, flow, compare, venn, pyramid, cycle, quadrant }),
);

/**
 * @param {string} name
 * @param {Form} render
 */
export function registerForm(name, render) {
  if (typeof render !== 'function') throw new TypeError(`form "${name}" must be a function`);
  registry.set(name, render);
}

/** @param {string} name */
export function getForm(name) {
  return registry.get(name);
}

export function formNames() {
  return [...registry.keys()];
}
