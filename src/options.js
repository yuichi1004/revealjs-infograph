/**
 * Configuration, resolved in one place.
 *
 * Three layers, narrowest wins:
 *
 *   DEFAULTS                 what this package thinks is right
 *   deck config `infograph`  what this talk thinks is right
 *   `data-ig-*` on the host  what this one figure needs
 *
 * The split between `data-ig-*` (behaviour) and bare `data-*` (the figure's
 * data) is deliberate and mirrors `count-up.js`: an author scanning a slide can
 * tell at a glance which attributes carry meaning and which carry preference.
 */

/**
 * @typedef {object} InfographConfig
 * @property {string} palette   Palette name from src/design/palette.js.
 * @property {'comfortable'|'compact'} density
 * @property {boolean} legend   Emit a legend block instead of direct labels.
 * @property {boolean} animate  Entrance animation when a slide becomes active.
 * @property {number} duration  Entrance animation length, ms.
 * @property {number} delay     Wait after the slide activates, ms.
 * @property {number} maxSeries Advise above this many series (working memory).
 * @property {boolean} quiet    Suppress authoring advice.
 * @property {string|null} symbol      Built-in silhouette name for waffle/bar marks.
 * @property {string|null} symbolPath  A custom 24×24 outline, instead of a name.
 */

/** @type {InfographConfig} */
export const DEFAULTS = {
  palette: 'default',
  density: 'comfortable',

  // Direct labelling is the default, not an option you have to find. Putting a
  // legend beside a chart splits the reader's attention between two places and
  // forces them to hold a colour→name mapping in working memory while reading
  // the chart. `legend: true` exists for the cases where labels genuinely will
  // not fit, and those cases are rarer than they feel.
  legend: false,

  animate: true,
  duration: 600,
  delay: 100,

  // Four, not seven. The "7±2" figure is about short-term memory span for
  // rehearsed digits; the number of chunks someone can hold while *also*
  // decoding a chart is closer to four.
  maxSeries: 4,

  quiet: false,

  // Blocks by default. A silhouette is opt-in because it only pays for itself
  // when the subject is a thing worth picturing — people, buildings, litres. A
  // deck about abstract percentages is better served by a plain square, and a
  // default that guessed otherwise would be decoration.
  symbol: null,
  symbolPath: null,
};

/** camelCase → the `data-ig-*` attribute that overrides it. */
const OPTION_ATTRS = /** @type {const} */ ({
  palette: 'igPalette',
  density: 'igDensity',
  legend: 'igLegend',
  animate: 'igAnimate',
  duration: 'igDuration',
  delay: 'igDelay',
  maxSeries: 'igMaxSeries',
  symbol: 'igSymbol',
  symbolPath: 'igSymbolPath',
});

/**
 * @param {string} raw
 * @returns {boolean}
 */
function toBoolean(raw) {
  return raw !== 'false' && raw !== '0' && raw !== 'off';
}

/**
 * Deck-wide config: `initReveal({ infograph: { … } })`.
 *
 * @param {Partial<InfographConfig>} [deckConfig]
 * @returns {InfographConfig}
 */
export function resolveConfig(deckConfig) {
  return { ...DEFAULTS, ...(deckConfig ?? {}) };
}

/**
 * Per-figure config: the deck's settings plus this element's `data-ig-*`.
 *
 * @param {Element} host
 * @param {InfographConfig} config
 * @returns {InfographConfig}
 */
export function resolveElementConfig(host, config) {
  const data = /** @type {HTMLElement} */ (host).dataset;
  const out = { ...config };

  for (const [key, attr] of Object.entries(OPTION_ATTRS)) {
    const raw = data[attr];
    if (raw === undefined) continue;

    switch (key) {
      case 'legend':
      case 'animate':
        // A bare `data-ig-legend` means "yes" — attribute presence is the
        // idiom reveal.js itself uses (`data-auto-animate`).
        out[key] = raw === '' ? true : toBoolean(raw);
        break;
      case 'duration':
      case 'delay':
      case 'maxSeries': {
        const n = Number(raw);
        if (Number.isFinite(n)) out[key] = n;
        break;
      }
      case 'density':
        if (raw === 'compact' || raw === 'comfortable') out.density = raw;
        break;
      default:
        // The remaining keys are all plain strings. Naming them keeps this cast
        // honest: add a non-string option without a `case` above and the
        // typechecker says so, rather than this silently widening to `any`.
        out[/** @type {'palette'|'symbol'|'symbolPath'} */ (key)] = raw;
    }
  }

  return out;
}
