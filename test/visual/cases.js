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
    id: 'flow-icons',
    title: 'flow — with icons',
    html: `<div data-infograph="flow">
             <div data-step="Problem" data-icon="alert">Fragmented teams</div>
             <div data-step="Intervention" data-icon="gear">Culture integration</div>
             <div data-step="Result" data-icon="check">66% shorter lead time</div>
           </div>`,
    note: 'An icon names a step, it never measures it — every icon here is the same size.',
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

  {
    id: 'pyramid',
    title: 'pyramid — Maslow’s hierarchy of needs',
    html: `<div data-infograph="pyramid"><ul>
             <li>Self-actualization</li>
             <li>Esteem</li>
             <li>Love and belonging</li>
             <li>Safety needs</li>
             <li>Physiological needs</li>
           </ul></div>`,
    note: 'Width states rank, not magnitude: tiers must narrow monotonically toward the apex.',
  },

  {
    id: 'pyramid-icons',
    title: 'pyramid — with icons',
    html: `<div data-infograph="pyramid"><ul>
             <li data-icon="star">Self-actualization</li>
             <li data-icon="person">Esteem</li>
             <li data-icon="heart">Love and belonging</li>
             <li data-icon="flag">Safety needs</li>
             <li data-icon="drop">Physiological needs</li>
           </ul></div>`,
    note: 'One icon per tier, next to its own label, all the same size.',
  },

  {
    id: 'cycle',
    title: 'cycle — PDCA',
    html: `<div data-infograph="cycle"><ul>
             <li>Plan</li>
             <li>Do</li>
             <li>Check</li>
             <li>Act</li>
           </ul></div>`,
    note: 'Connectors are real arcs, not straight chords, and the loop closes back to the first stage.',
  },

  {
    id: 'cycle-icons',
    title: 'cycle — PDCA, with icons',
    html: `<div data-infograph="cycle"><ul>
             <li data-icon="clock">Plan</li>
             <li data-icon="gear">Do</li>
             <li data-icon="check">Check</li>
             <li data-icon="flag">Act</li>
           </ul></div>`,
    note: 'A stage label with an icon splits into an icon above a text span; the ring geometry grows to clear it.',
  },

  {
    id: 'quadrant',
    title: 'quadrant — Eisenhower matrix',
    html: `<div data-infograph="quadrant"
                data-x-label="Urgency" data-columns="Urgent, Not urgent"
                data-y-label="Importance" data-rows="Important, Not important">
             <div data-label="Do First"><ul><li>Fix production bug</li><li>Client deadline today</li></ul></div>
             <div data-label="Schedule"><ul><li>Plan Q3 roadmap</li></ul></div>
             <div data-label="Delegate"><ul><li>Answer routine emails</li></ul></div>
             <div data-label="Eliminate"><ul><li>Check social media</li></ul></div>
           </div>`,
    note: 'Both ends of each axis are named, so the direction is legible without guessing at it.',
  },

  {
    id: 'quadrant-icons',
    title: 'quadrant — Eisenhower matrix, with icons',
    html: `<div data-infograph="quadrant"
                data-x-label="Urgency" data-columns="Urgent, Not urgent"
                data-y-label="Importance" data-rows="Important, Not important">
             <div data-label="Do First" data-icon="alert"><ul><li>Fix production bug</li><li>Client deadline today</li></ul></div>
             <div data-label="Schedule" data-icon="clock"><ul><li>Plan Q3 roadmap</li></ul></div>
             <div data-label="Delegate" data-icon="flag"><ul><li>Answer routine emails</li></ul></div>
             <div data-label="Eliminate" data-icon="target"><ul><li>Check social media</li></ul></div>
           </div>`,
    note: 'A cell title gains a head row (icon + title) only when it has an icon.',
  },

  {
    id: 'quadrant-ja',
    title: 'quadrant — Eisenhower matrix, in Japanese',
    html: `<div data-infograph="quadrant"
                data-x-label="緊急度" data-columns="緊急、緊急でない"
                data-y-label="重要度" data-rows="重要、重要でない">
             <div data-label="すぐやる"><ul><li>本番障害の対応</li><li>本日締切の提出物</li></ul></div>
             <div data-label="計画する"><ul><li>来期ロードマップの策定</li></ul></div>
             <div data-label="任せる"><ul><li>定型メールの返信</li></ul></div>
             <div data-label="やめる"><ul><li>SNSの巡回</li></ul></div>
           </div>`,
    note: 'The y-axis label is CJK — vertical-rl text must stay upright, never rotated onto its side.',
  },

  {
    id: 'flow-wrapped',
    title: 'flow — five steps, wraps onto a second row',
    html: `<div data-infograph="flow">
             <div data-step="Discover">Interviews</div>
             <div data-step="Define">Problem statement</div>
             <div data-step="Develop">Prototypes</div>
             <div data-step="Deliver">Pilot rollout</div>
             <div data-step="Measure">Adoption metrics</div>
           </div>`,
    note: 'A connector and the step it introduces wrap onto the next row together — never a stranded arrow at the end of one row and a connector-less step starting the next.',
  },

  {
    id: 'cycle-6-ja',
    title: 'cycle — six stages, Japanese labels',
    html: `<div data-infograph="cycle"><ul>
             <li>仮説</li>
             <li>実験設計</li>
             <li>実装</li>
             <li>計測</li>
             <li>振り返り</li>
             <li>方針更新</li>
           </ul></div>`,
    note: 'A label at a diagonal stage grows away from the ring along whichever axis needs it, so a longer label never crosses the arc beside it.',
  },

  {
    id: 'cycle-8',
    title: 'cycle — eight stages',
    html: `<div data-infograph="cycle"><ul>
             <li>Intake</li>
             <li>Triage</li>
             <li>Assign</li>
             <li>Fix</li>
             <li>Review</li>
             <li>Test</li>
             <li>Ship</li>
             <li>Monitor</li>
           </ul></div>`,
    note: 'Eight stages leaves little room between a node and its own label — the outward anchor keeps the label from touching the node beside it.',
  },

  {
    id: 'venn-long-a',
    title: 'venn — a long label',
    html: `<div data-infograph="venn" data-overlap="0.35"
                data-a="社内開発とグローバル化推進の長期戦略" data-b="海外拠点" data-ab="文化統合"></div>`,
    note: 'A label long enough to reach past the figure wraps and grows downward instead — the AB label below it moves to make room.',
  },
];

/** @param {string} id */
export function caseById(id) {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`no visual case "${id}"`);
  return found;
}
