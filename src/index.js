/**
 * revealjs-infograph — public entry point.
 *
 *   import Infograph from 'revealjs-infograph';
 *   import 'revealjs-infograph/styles.css';
 *
 *   Reveal.initialize({ plugins: [Infograph] });
 *
 * The default export is the reveal.js plugin. Everything else is exported for
 * the two cases the plugin does not cover: rendering figures on a page that has
 * no reveal.js (`renderAll`), and adding a form of your own (`registerForm`).
 *
 * The CSS is intentionally *not* imported here. Decks pick their own theme
 * loading order — a stylesheet that imports itself would land at whatever
 * position the bundler chose, which is exactly the kind of thing that makes a
 * theme override silently stop working.
 */

export { default } from './plugin.js';
export { default as Infograph } from './plugin.js';

export { renderAll, renderHost, restore, hostsIn } from './render.js';
export { registerForm, getForm, formNames } from './forms/index.js';
export { DEFAULTS, resolveConfig, resolveElementConfig } from './options.js';
export { parseNumber, formatNumber, readItems, parseItemList } from './parse.js';
export { PALETTES, THRESHOLDS, resolvePalette, auditPalette, seriesVar } from './design/palette.js';
export { contrastRatio, deltaE, simulateCvd, separation } from './design/contrast.js';
export { INTENTS, recommendForm } from './design/encode.js';
export { el, svgEl, cls, NS } from './dom.js';
export { figure, dataTable, hideFromAt } from './a11y.js';
