/**
 * Build entry for the script-tag / CDN path.
 *
 *   <link rel="stylesheet" href="dist/infograph.css" />
 *   <script src="dist/infograph.iife.js"></script>
 *   <script>Reveal.initialize({ plugins: [RevealInfograph] });</script>
 *
 * Differs from src/index.js in exactly two ways: it pulls the stylesheet into
 * the bundle (a script-tag deck has no bundler to do it), and the global it
 * defines *is* the plugin object, so it drops straight into reveal's `plugins`
 * array with no `.default` hop.
 *
 * The handful of helpers are hung off that object for the rare standalone use
 * (`RevealInfograph.renderAll(document.body)` on a page with no reveal at all).
 * Bundler users should import 'revealjs-infograph' and ignore this file.
 */

import '../styles/infograph.css';
import plugin from './plugin.js';
import { renderAll, restore } from './render.js';
import { registerForm, formNames } from './forms/index.js';
import { resolveConfig } from './options.js';

export default Object.assign(plugin, {
  renderAll: (/** @type {Element} */ root, /** @type {any} */ config) =>
    renderAll(root, resolveConfig(config)),
  restore,
  registerForm,
  formNames,
});
