/**
 * A stand-in for reveal.js.
 *
 * The plugin touches four methods (`getConfig`, `getRevealElement`, `on`,
 * `isPrintView`) and three events. Faking that is a dozen lines and buys a lot:
 * the test suite never loads reveal.js, never needs a real layout, and runs the
 * whole lifecycle — ready, slide changes, fragments, print view — synchronously
 * and in any order a test likes.
 *
 * The escape hatch is the examples/ playground, which runs the real thing.
 */

/**
 * @param {object} [options]
 * @param {any} [options.config]      Deck config, as reveal's getConfig() returns.
 * @param {Element} [options.root]    The `.reveal` element.
 * @param {boolean} [options.print]   Report print view.
 */
export function fakeDeck({ config = {}, root, print = false } = {}) {
  /** @type {Map<string, Array<(event: any) => void>>} */
  const listeners = new Map();

  const element = root ?? document.body;

  return {
    getConfig: () => config,
    getRevealElement: () => element,
    isPrintView: () => print,

    /** @param {string} type @param {(event: any) => void} fn */
    on(type, fn) {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },

    /**
     * Fire a reveal lifecycle event at the plugin.
     * @param {string} type
     * @param {any} [event]
     */
    emit(type, event = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
  };
}

/**
 * Build a deck's DOM from slide HTML fragments.
 *
 * @param {...string} slides
 * @returns {{ root: HTMLElement, slides: HTMLElement[] }}
 */
export function mountDeck(...slides) {
  const root = document.createElement('div');
  root.className = 'reveal';
  const container = document.createElement('div');
  container.className = 'slides';
  root.append(container);

  for (const html of slides) {
    const section = document.createElement('section');
    section.innerHTML = html;
    container.append(section);
  }

  document.body.append(root);
  return { root, slides: /** @type {HTMLElement[]} */ ([...container.children]) };
}
