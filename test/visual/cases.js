/**
 * The visual suite's cases, in one place.
 *
 * Imported by both the fixture page (which renders them) and the specs (which
 * assert on them). That is the whole reason this file exists: an expected bar
 * ratio should not have to be re-derived from markup embedded in an HTML file,
 * because the moment those two drift the suite starts passing for the wrong
 * reason.
 *
 * Each case:
 *   id       kebab-case; becomes the DOM id and the screenshot filename
 *   title    printed above the figure, for anyone opening the fixture by hand
 *   html     the authored markup, exactly as a deck author would write it
 *   values   the numbers the markup encodes, when a spec needs to check that
 *            the geometry matches them
 *   note     why this case is in the suite (not shown on the page)
 */

/**
 * @typedef {object} Case
 * @property {string} id
 * @property {string} title
 * @property {string} html
 * @property {number[]} [values]
 * @property {number} [emphasis]  1-based index of the emphasised item.
 * @property {string} note
 */

/** @type {Case[]} */
export const CASES = [
  {
    id: 'stat',
    title: 'stat',
    html: `<div data-infograph="stat" data-value="43.8%" data-label="Respondents who say culture integration drove the results"
                data-note="n=1,204 · 2026 internal survey"></div>`,
    note: 'Baseline for the type scale and for contrast on the ink-1 headline.',
  },

  {
    id: 'waffle',
    title: 'waffle',
    html: `<div data-infograph="waffle" data-value="43.8%" data-label="Respondents who agreed"></div>`,
    values: [43.8],
    note: 'Cell count, 10-column grid, square cells, contiguous fill.',
  },

  {
    id: 'bar-plain',
    title: 'bar — no emphasis',
    html: `<div data-infograph="bar" data-label="Where people work each week"
                data-items="Remote: 34, Office: 52, Hybrid: 71"></div>`,
    values: [34, 52, 71],
    note: 'Common baseline and length proportionality; all bars one colour.',
  },

  {
    id: 'bar-emphasis',
    title: 'bar — with emphasis',
    html: `<div data-infograph="bar" data-label="Where people work each week" data-emphasis="3"
                data-items="Remote: 34, Office: 52, Hybrid: 71"></div>`,
    values: [34, 52, 71],
    emphasis: 3,
    note: 'Signalling: exactly one bar keeps the mark colour, the rest go gray.',
  },

  {
    id: 'bar-long-labels',
    title: 'bar — long labels',
    html: `<div data-infograph="bar" data-label="By department"
                data-items="Platform Engineering: 88, IT Systems: 41, Corporate IT: 63"></div>`,
    values: [88, 41, 63],
    note: 'Labels of unequal width must not ragged the bars’ shared left edge.',
  },

  {
    id: 'waffle-symbol',
    title: 'waffle — pictogram marks',
    html: `<div data-infograph="waffle" data-value="43.8%" data-label="Respondents who agreed"
                data-ig-symbol="person"></div>`,
    values: [43.8],
    note: 'ISOTYPE: the cells must stay square and countable when they become glyphs.',
  },

  {
    id: 'bar-symbol',
    title: 'bar — pictogram marks',
    html: `<div data-infograph="bar" data-label="Where people work each week"
                data-ig-symbol="person" data-ig-symbol-unit="10"
                data-items="Remote: 34, Office: 52, Hybrid: 71"></div>`,
    values: [34, 52, 71],
    note: 'One symbol = 10, so the count is the value; the last symbol is clipped, never shrunk.',
  },

  {
    id: 'flow',
    title: 'flow',
    html: `<div data-infograph="flow">
             <div data-step="Problem">Fragmented teams</div>
             <div data-step="Intervention">Culture integration</div>
             <div data-step="Result">66% shorter lead time</div>
           </div>`,
    note: 'Connectors sit in the gaps between steps, never at the ends.',
  },

  {
    id: 'compare',
    title: 'compare',
    html: `<div data-infograph="compare" data-label="Average lead time">
             <div data-item="Before" data-value="18 days"></div>
             <div data-item="After" data-value="6 days"></div>
           </div>`,
    values: [18, 6],
    note: 'Derived delta is rendered, and the second side carries the emphasis.',
  },

  {
    id: 'venn-narrow',
    title: 'venn — overlap 0.05',
    html: `<div data-infograph="venn" data-overlap="0.05"
                data-a="In-house development" data-b="Globalization" data-ab="Culture integration"></div>`,
    note: 'Lens geometry at the small end; labels must stay under their circles.',
  },

  {
    id: 'venn-default',
    title: 'venn — overlap 0.35 (default)',
    html: `<div data-infograph="venn" data-overlap="0.35"
                data-a="In-house development" data-b="Globalization" data-ab="Culture integration"></div>`,
    note: 'The doc example — same markup as the README, so the gallery image is provably accurate.',
  },

  {
    id: 'venn-wide',
    title: 'venn — overlap 0.55',
    html: `<div data-infograph="venn" data-overlap="0.55"
                data-a="In-house development" data-b="Globalization" data-ab="Culture integration"></div>`,
    note: 'Lens geometry at the large end. Same labels, so a diff isolates shape.',
  },
];

/** @param {string} id */
export function caseById(id) {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`no visual case "${id}"`);
  return found;
}
