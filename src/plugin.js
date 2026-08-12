/**
 * The reveal.js binding — and nothing else.
 *
 * Everything above this file works on a plain DOM tree, which is deliberate:
 * reveal.js is an optional peer dependency, the tests never load it, and a
 * figure can be dropped into any page with `renderAll()`.
 *
 * One decision shapes this file: **the whole deck is rendered once, at `ready`,
 * not per slide as it becomes active.**
 *
 * Rendering lazily would save a few milliseconds and break auto-animate, which
 * measures the outgoing and incoming slides' elements *before* the transition
 * starts. An element that does not exist until its slide is current cannot be
 * matched to its counterpart, so a figure morphing across two slides would jump
 * instead of moving. It also breaks the overview mode and print export, both of
 * which show slides that were never "current".
 *
 * Animation, in contrast, is per slide: that is the part that should only
 * happen when someone is looking at it.
 */

import { resolveConfig } from './options.js';
import { renderAll, hostsIn, restore, configFor } from './render.js';
import { setQuiet } from './warn.js';
import { shouldAnimate, play, reset, isPending, figuresIn } from './motion.js';

/**
 * @typedef {object} Deck  The slice of the reveal.js API this plugin uses.
 * @property {() => any} getConfig
 * @property {() => HTMLElement} getRevealElement
 * @property {(type: string, listener: (event: any) => void) => void} on
 * @property {() => boolean} [isPrintView]
 */

export default {
  id: 'infograph',

  /** @param {Deck} deck */
  init(deck) {
    const config = resolveConfig(deck.getConfig().infograph);
    setQuiet(config.quiet);

    const root = deck.getRevealElement();
    renderAll(root, config);

    const playIn = (/** @type {Element|null|undefined} */ scope) => {
      for (const figure of figuresIn(scope)) {
        // Per figure, not per deck: `data-ig-animate="false"` or a longer
        // duration on one figure has to survive the trip from render time.
        const figureConfig = configFor(figure, config);
        if (shouldAnimate(deck, figureConfig) && !isPending(figure)) play(figure, figureConfig);
      }
    };

    deck.on('ready', (event) => playIn(event.currentSlide));

    deck.on('slidechanged', (event) => {
      // Reset the slide being left so returning to it replays, rather than
      // showing a figure mid-animation from last time.
      for (const figure of figuresIn(event.previousSlide)) reset(figure);
      playIn(event.currentSlide);
    });

    deck.on('fragmentshown', (event) => playIn(event.fragment));

    return {
      /**
       * Re-render part of the deck. For decks that build slides at runtime:
       *
       *   deck.getPlugin('infograph').render(newSection);
       *
       * @param {Element} [scope]
       */
      render(scope) {
        const figures = renderAll(scope ?? root, config);
        playIn(scope ?? root);
        return figures;
      },

      /**
       * Put the authored markup back — useful when another tool wants to own
       * the DOM, and what the tests use to prove rendering is reversible.
       * @param {Element} [scope]
       */
      restore(scope) {
        for (const host of hostsIn(scope ?? root)) restore(host);
      },

      config,
    };
  },
};
