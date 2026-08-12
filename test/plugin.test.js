import { describe, it, expect, vi } from 'vitest';
import Infograph, { renderAll, resolveConfig } from '../src/index.js';
import { fakeDeck, mountDeck } from './helpers/deck.js';

const STAT = '<div data-infograph="stat" data-value="43.8%" data-label="同意"></div>';

/** @param {{ config?: any, print?: boolean, slides?: string[] }} [options] */
function boot({ config = {}, print = false, slides = [STAT, STAT] } = {}) {
  const deck = mountDeck(...slides);
  const reveal = fakeDeck({ config, root: deck.root, print });
  const api = Infograph.init(reveal);
  return { ...deck, reveal, api };
}

describe('rendering', () => {
  it('renders every slide at ready, not just the current one', () => {
    // Lazy rendering would break auto-animate, which measures both slides
    // before the transition starts. See the comment at the top of plugin.js.
    const { root } = boot();
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(2);
  });

  it('marks the authored host with the form it rendered', () => {
    const { slides } = boot({ slides: [STAT] });
    const host = /** @type {HTMLElement} */ (slides[0].querySelector('[data-infograph]'));
    expect(host.dataset.igRendered).toBe('stat');
  });

  it('is idempotent — a second render does not nest figures', () => {
    const { root, api } = boot({ slides: [STAT] });
    api.render();
    api.render();
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(1);
  });

  it('restores the authored markup exactly', () => {
    const { slides, api } = boot({ slides: [STAT] });
    api.restore();
    expect(slides[0].innerHTML.trim()).toBe(STAT);
  });

  it('re-renders from the authored markup, not from its own output', () => {
    const { slides, api } = boot({ slides: [STAT] });
    const host = /** @type {HTMLElement} */ (slides[0].querySelector('[data-infograph]'));
    host.dataset.value = '80%';
    api.render();
    expect(host.querySelector('.ig-stat-value')?.textContent).toBe('80%');
    expect(host.querySelectorAll('.ig-figure')).toHaveLength(1);
  });

  it('leaves the rest of the deck alone when one figure throws', () => {
    const bad = '<div data-infograph="stat" data-value="1"></div>';
    const { root } = boot({ slides: ['<div data-infograph="does-not-exist"></div>', bad] });
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(1);
  });
});

describe('configuration', () => {
  it('takes deck-wide defaults from the reveal config', () => {
    const { api } = boot({ config: { infograph: { duration: 1400, density: 'compact' } } });
    expect(api.config.duration).toBe(1400);
    expect(api.config.density).toBe('compact');
  });

  it('lets a single figure override the deck', () => {
    const { root, reveal, slides } = boot({
      config: { infograph: { duration: 1400 } },
      slides: [
        '<div data-infograph="stat" data-value="1" data-label="x" data-ig-duration="200"></div>',
        '<div data-infograph="stat" data-value="2" data-label="y"></div>',
      ],
    });
    reveal.emit('ready', { currentSlide: slides[0] });
    reveal.emit('slidechanged', { previousSlide: slides[0], currentSlide: slides[1] });

    const durations = [...root.querySelectorAll('.ig-figure')].map((figure) =>
      /** @type {HTMLElement} */ (figure).style.getPropertyValue('--ig-enter-duration'),
    );
    expect(durations).toEqual(['200ms', '1400ms']);
  });

  it('lets a single figure opt out of animation entirely', () => {
    const { root, reveal, slides } = boot({
      slides: [
        '<div data-infograph="stat" data-value="1" data-label="x" data-ig-animate="false"></div>',
      ],
    });
    reveal.emit('ready', { currentSlide: slides[0] });
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(1);
    expect(root.querySelectorAll('.ig-enter')).toHaveLength(0);
  });

  it('silences advice when the deck asks for quiet', () => {
    boot({ config: { infograph: { quiet: true } }, slides: ['<div data-infograph="stat"></div>'] });
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('animation lifecycle', () => {
  it('animates the current slide on ready and no others', () => {
    const { root, reveal, slides } = boot();
    reveal.emit('ready', { currentSlide: slides[0] });
    expect(slides[0].querySelector('.ig-figure')?.classList.contains('ig-enter')).toBe(true);
    expect(slides[1].querySelector('.ig-figure')?.classList.contains('ig-enter')).toBe(false);
    expect(root.querySelectorAll('.ig-enter')).toHaveLength(1);
  });

  it('resets the slide being left so a revisit replays', () => {
    const { reveal, slides } = boot();
    reveal.emit('ready', { currentSlide: slides[0] });
    reveal.emit('slidechanged', { previousSlide: slides[0], currentSlide: slides[1] });
    expect(slides[0].querySelector('.ig-figure')?.classList.contains('ig-enter')).toBe(false);
    expect(slides[1].querySelector('.ig-figure')?.classList.contains('ig-enter')).toBe(true);
  });

  it('waits for a figure hidden behind an unrevealed fragment', () => {
    const { reveal, slides } = boot({ slides: [`<div class="fragment">${STAT}</div>`] });
    reveal.emit('ready', { currentSlide: slides[0] });
    expect(slides[0].querySelector('.ig-figure')?.classList.contains('ig-enter')).toBe(false);

    const fragment = /** @type {HTMLElement} */ (slides[0].querySelector('.fragment'));
    fragment.classList.add('visible');
    reveal.emit('fragmentshown', { fragment });
    expect(slides[0].querySelector('.ig-figure')?.classList.contains('ig-enter')).toBe(true);
  });

  it('never animates in print view — but still renders', () => {
    const { root, reveal, slides } = boot({ print: true });
    reveal.emit('ready', { currentSlide: slides[0] });
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(2);
    expect(root.querySelectorAll('.ig-enter')).toHaveLength(0);
  });

  it('never animates when the reader asks for reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        /** @type {any} */ ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener() {},
          removeEventListener() {},
        }),
    );
    const { root, reveal, slides } = boot();
    reveal.emit('ready', { currentSlide: slides[0] });
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(2);
    expect(root.querySelectorAll('.ig-enter')).toHaveLength(0);
  });

  it('honours animate: false without affecting the rendered output', () => {
    const { root, reveal, slides } = boot({ config: { infograph: { animate: false } } });
    reveal.emit('ready', { currentSlide: slides[0] });
    expect(root.querySelectorAll('.ig-figure')).toHaveLength(2);
    expect(root.querySelectorAll('.ig-enter')).toHaveLength(0);
  });
});

describe('use without reveal.js', () => {
  it('renders into any element', () => {
    const host = document.createElement('div');
    host.innerHTML = STAT;
    document.body.append(host);

    const figures = renderAll(host, resolveConfig());
    expect(figures).toHaveLength(1);
    expect(figures[0].querySelector('.ig-stat-value')?.textContent).toBe('43.8%');
  });

  it('renders an element that is itself the host', () => {
    const host = document.createElement('div');
    host.dataset.infograph = 'stat';
    host.dataset.value = '7';
    host.dataset.label = '件';
    document.body.append(host);

    expect(renderAll(host, resolveConfig())).toHaveLength(1);
  });
});
