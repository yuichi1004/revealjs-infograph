/*
 * The playground deck.
 *
 * It imports ../src/index.js directly — no build step, no package link — so
 * editing a form and seeing it on a slide is one save. It also runs the real
 * reveal.js, which is the half of the behaviour the unit tests deliberately do
 * not cover: auto-animate measurement, fragments, print export, actual layout.
 *
 * The reveal settings below mirror the ones a real deck uses, including the two
 * non-obvious ones (`display: 'flex'` and leaving `center` at its default) that
 * decks using absolutely-positioned or SVG figures have to get right.
 */

import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/white.css'; // structural base
import Notes from 'reveal.js/plugin/notes';

import Infograph from '../src/index.js';
import '../styles/infograph.css'; // after the reveal theme, before our overrides
import './theme.css';

const deck = new Reveal(document.querySelector('.reveal'), {
  width: 1280,
  height: 720,
  margin: 0.06,
  hash: true,
  transition: 'fade',
  transitionSpeed: 'fast',
  autoAnimateDuration: 0.7,
  autoAnimateEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  slideNumber: false,
  progress: true,

  // reveal writes `display` inline on every *loaded* slide, not just the active
  // one. Without this the outgoing slide falls back to `display: block`
  // mid-fade and centred content jumps to the left edge.
  display: 'flex',

  // `center` stays at its default (true) on purpose. With center:false reveal
  // measures auto-animate pairs via offsetLeft/offsetWidth, which are undefined
  // on SVG elements — producing translate(NaNpx, NaNpx) and silently killing
  // the animation on the venn slides. center:true measures with
  // getBoundingClientRect(), which works for SVG and HTML alike.

  plugins: [Notes, Infograph],

  // Deck-wide infograph defaults. Every one of these is also settable per
  // figure with data-ig-*.
  infograph: {
    duration: 700,
  },
});

deck.initialize();

// Handy while developing a form: `window.deck.getPlugin('infograph').render()`
// re-renders from the authored markup after poking at attributes in devtools.
window.deck = deck;
