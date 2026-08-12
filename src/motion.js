/**
 * Entrance animation.
 *
 * One rule decides the whole design here: **the resting state is the finished
 * state**. Animation is a class that gets added, plays a CSS keyframe, and
 * leaves the figure exactly where it already was. Nothing about the final
 * appearance depends on JavaScript having run.
 *
 * That is what makes the degraded paths free rather than special-cased:
 * `?print-pdf`, `prefers-reduced-motion: reduce`, a deck that never loads the
 * plugin's JS, and a figure that scrolls into view before `ready` fires all
 * show the same correct figure. The alternative — animating *into* the final
 * state from a hidden initial state — turns every one of those into a bug where
 * the figure is invisible.
 *
 * Motion is also, deliberately, small: a short rise and fade, staggered across
 * marks. Its job is to signal "this is new, look here", which is a
 * signalling-principle job. Motion that has to be watched to be understood is
 * motion that competes with the speaker.
 */

import { cls } from './dom.js';

const ENTER = cls('enter');

/**
 * Whether animation should run at all right now.
 *
 * Re-checked per play rather than cached at init: a reader can toggle the OS
 * reduced-motion setting mid-talk, and reveal enters print view without
 * reloading the page.
 *
 * @param {{ isPrintView?: () => boolean }|null|undefined} deck
 * @param {import('./options.js').InfographConfig} config
 */
export function shouldAnimate(deck, config) {
  if (!config.animate) return false;
  if (deck?.isPrintView?.()) return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Play the entrance on one figure.
 *
 * @param {HTMLElement} figure
 * @param {import('./options.js').InfographConfig} config
 */
export function play(figure, config) {
  figure.style.setProperty('--ig-enter-duration', `${config.duration}ms`);
  figure.style.setProperty('--ig-enter-delay', `${config.delay}ms`);

  // Remove-reflow-add: without the forced reflow the browser coalesces the
  // remove and the add into no change at all, and revisiting a slide shows a
  // static figure. Reading offsetWidth is the cheapest way to flush style.
  figure.classList.remove(ENTER);
  void figure.offsetWidth;
  figure.classList.add(ENTER);
}

/** @param {HTMLElement} figure */
export function reset(figure) {
  figure.classList.remove(ENTER);
}

/**
 * Figures inside an un-revealed fragment wait for `fragmentshown`, so a build
 * does not spend its reveal on something already animated off-screen.
 *
 * @param {Element} node
 */
export function isPending(node) {
  const fragment = node.closest('.fragment');
  return !!fragment && !fragment.classList.contains('visible');
}

/**
 * Every figure inside `root`, including `root` itself.
 * @param {Element|null|undefined} root
 * @returns {HTMLElement[]}
 */
export function figuresIn(root) {
  if (!root) return [];
  const found = /** @type {HTMLElement[]} */ ([...root.querySelectorAll(`.${cls('figure')}`)]);
  if (root.matches?.(`.${cls('figure')}`)) found.unshift(/** @type {HTMLElement} */ (root));
  return found;
}
