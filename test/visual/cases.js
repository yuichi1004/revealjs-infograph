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
    html: `<div data-infograph="stat" data-value="43.8%" data-label="回答者が同意"
                data-note="n=1,204 / 2026年調査"></div>`,
    note: 'Baseline for the type scale and for contrast on the ink-1 headline.',
  },

  {
    id: 'waffle',
    title: 'waffle',
    html: `<div data-infograph="waffle" data-value="43.8%" data-label="同意した回答者"></div>`,
    values: [43.8],
    note: 'Cell count, 10-column grid, square cells, contiguous fill.',
  },

  {
    id: 'bar-plain',
    title: 'bar — 強調なし',
    html: `<div data-infograph="bar" data-label="週あたりの稼働場所"
                data-items="在宅: 34, 出社: 52, ハイブリッド: 71"></div>`,
    values: [34, 52, 71],
    note: 'Common baseline and length proportionality; all bars one colour.',
  },

  {
    id: 'bar-emphasis',
    title: 'bar — 強調あり',
    html: `<div data-infograph="bar" data-label="週あたりの稼働場所" data-emphasis="3"
                data-items="在宅: 34, 出社: 52, ハイブリッド: 71"></div>`,
    values: [34, 52, 71],
    emphasis: 3,
    note: 'Signalling: exactly one bar keeps the mark colour, the rest go gray.',
  },

  {
    id: 'bar-long-labels',
    title: 'bar — 長いラベル',
    html: `<div data-infograph="bar" data-label="部門別"
                data-items="プラットフォーム基盤: 88, 情報システム: 41, コーポレートIT: 63"></div>`,
    values: [88, 41, 63],
    note: 'Labels of unequal width must not ragged the bars’ shared left edge.',
  },

  {
    id: 'flow',
    title: 'flow',
    html: `<div data-infograph="flow">
             <div data-step="課題">分断されたチーム</div>
             <div data-step="介入">文化統合</div>
             <div data-step="結果">リードタイム 66% 短縮</div>
           </div>`,
    note: 'Connectors sit in the gaps between steps, never at the ends.',
  },

  {
    id: 'compare',
    title: 'compare',
    html: `<div data-infograph="compare" data-label="平均リードタイム">
             <div data-item="導入前" data-value="18日"></div>
             <div data-item="導入後" data-value="6日"></div>
           </div>`,
    values: [18, 6],
    note: 'Derived delta is rendered, and the second side carries the emphasis.',
  },

  {
    id: 'venn-narrow',
    title: 'venn — overlap 0.05',
    html: `<div data-infograph="venn" data-overlap="0.05"
                data-a="内製開発" data-b="グローバル化" data-ab="文化統合"></div>`,
    note: 'Lens geometry at the small end; labels must stay under their circles.',
  },

  {
    id: 'venn-wide',
    title: 'venn — overlap 0.55',
    html: `<div data-infograph="venn" data-overlap="0.55"
                data-a="内製開発" data-b="グローバル化" data-ab="文化統合"></div>`,
    note: 'Lens geometry at the large end. Same labels, so a diff isolates shape.',
  },
];

/** @param {string} id */
export function caseById(id) {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`no visual case "${id}"`);
  return found;
}
