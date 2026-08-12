# revealjs-infograph

認知科学に基づいたインフォグラフを、**HTML 属性を書くだけ**で作る reveal.js プラグイン。

```html
<div data-infograph="waffle" data-value="43.8%" data-label="回答者が同意"></div>
```

座標も、配色も、凡例の位置も、代替テキストも書きません。それらは「何を伝えたいか」から決まる
はずのもので、スライドごとに手で決め直すものではないからです。

- **手書き SVG の絶対座標をやめる** — 文言を変えるたびに `left: 60px` を直す作業がなくなります
- **配色は検証済み** — コントラスト比と色覚多様性下の ΔE2000 を CI で強制（`npm run validate:palette`）
- **静止状態が完成状態** — 印刷・`prefers-reduced-motion`・JS 無効でも同じ正しい図が出ます
- **依存ゼロ** — reveal.js すら optional peer。`renderAll()` で素の HTML ページにも置けます

原則とその実装場所の対応は [docs/principles.md](docs/principles.md) にまとめてあります。

---

## 導入

### バンドラ（Vite など）を使う場合

```sh
npm i revealjs-infograph
```

```js
import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import 'reveal.js/theme/white.css';

import Infograph from 'revealjs-infograph';
import 'revealjs-infograph/styles.css'; // reveal のテーマより後、自前の上書きより前

new Reveal(document.querySelector('.reveal'), {
  plugins: [Infograph],
}).initialize();
```

既に `shared/reveal-init.js` のような共通初期化がある場合は、`plugins` 配列に 1 つ足すだけです。

```js
plugins: [Highlight, Notes, CountUp, Infograph, ...(options.plugins ?? [])],
```

### script タグ / CDN の場合

```html
<link rel="stylesheet" href="dist/infograph.css" />
<script src="dist/infograph.iife.js"></script>
<script>
  Reveal.initialize({ plugins: [RevealInfograph] });
</script>
```

### reveal.js を使わない場合

```js
import { renderAll, resolveConfig } from 'revealjs-infograph';
renderAll(document.body, resolveConfig());
```

---

## 配色は自動で引き継がれます

`styles/infograph.css` の変数は、ホスト側のトークンにフォールバックする形で定義されています。

```css
--ig-mark-1: var(--c-blue, #2a78d6);
```

つまり `--c-blue` を既に定義しているデッキは、**設定なしで自分のブランド色の図**になります。
明示的に上書きしたいときは `--ig-mark-1` を直接定義してください。どちらも定義しなければ、
検証済みの既定パレットが使われます。

| 変数                            | 用途                                           | ホスト側フォールバック             |
| ------------------------------- | ---------------------------------------------- | ---------------------------------- |
| `--ig-mark-1` `-2` `-3`         | 塗り（バー・セル・円）。小さい文字には使わない | `--c-blue` `--c-orange` `--c-aqua` |
| `--ig-ink-1` `-2` `-3`          | 同じ色相を 4.5:1 まで暗くした文字色            | `--c-blue-deep` など               |
| `--ig-surface` `--ig-surface-2` | 背景                                           | `--surface` `--surface-2`          |
| `--ig-text` `--ig-text-2`       | 本文・補助テキスト                             | `--ink` `--ink-2`                  |
| `--ig-muted`                    | 非強調のグレー                                 | `--muted-mark`                     |
| `--ig-figure-width`             | 図の最大幅                                     | —                                  |

---

## 記述のルール

規約は 3 つだけです。

| 書き方                 | 意味                                               |
| ---------------------- | -------------------------------------------------- |
| `data-infograph="..."` | 図の種類                                           |
| `data-*`（素）         | その図の**データ**（値・ラベル・項目）             |
| `data-ig-*`            | プラグインの**挙動**（配色・密度・アニメーション） |

`count-up` プラグインの `data-count-up-*` と同じ役割分担です。スライドを眺めたときに、
意味を運ぶ属性と好みを運ぶ属性が見分けられます。

---

## フォーム一覧

### `stat` — 単一の主役数値

```html
<div
  data-infograph="stat"
  data-value="43.8%"
  data-label="回答者が同意"
  data-note="n=1,204 / 2026年調査"
></div>
```

量が 1 つしかないなら比較の支えは要りません。軸もスケールもマークも情報量ゼロの装飾になります。

| 属性         | 意味                                                 |
| ------------ | ---------------------------------------------------- |
| `data-value` | 数値（`43.8%` `1,204` `¥1,234万` `18日` いずれも可） |
| `data-label` | それが何を数えたものか                               |
| `data-note`  | 出典・期間などの補足                                 |

### `waffle` — 全体に対する割合

```html
<div data-infograph="waffle" data-value="43.8%" data-label="同意した回答者"></div>
<div data-infograph="waffle" data-value="438" data-total="1000"></div>
```

10×10 のグリッド。円グラフが角度と面積の判断を求めるところを、**数える**作業に置き換えます。
4 行と 4 セルは「44」であって「半分弱くらい」ではありません。

セル数は最も近い整数に丸めますが、**表示される数値は著者が書いた正確な値**のままです。

| 属性         | 意味                               |
| ------------ | ---------------------------------- |
| `data-value` | 割合（`43.8%`）または件数（`438`） |
| `data-total` | 件数指定のときの母数。既定 100     |
| `data-label` | 何の割合か                         |

### `bar` — 量の比較

```html
<div data-infograph="bar" data-emphasis="2">
  <div data-item="在宅" data-value="34"></div>
  <div data-item="出社" data-value="52"></div>
</div>

<!-- 同じ図の短い書き方 -->
<div data-infograph="bar" data-items="在宅: 34, 出社: 52"></div>
```

横棒です。カテゴリ名は言葉であり、言葉は横に長い。横棒なら 1 行ずつ、回転も省略もなしで置けます。
基線は常にゼロで、軸の切り詰めは実装していません（長さが量を意味しなくなるため）。

強調を指定すると、その 1 本だけが色を保ち、残りはグレーに落ちます。指定しなければ全部同色です。

| 属性            | 意味                                                             |
| --------------- | ---------------------------------------------------------------- |
| `data-items`    | `ラベル: 値` をカンマ区切り。`、` と `：` も使えます             |
| `data-emphasis` | 強調する項目（1 始まり）。子要素側の `data-emphasis` でも可      |
| `data-label`    | 図全体の名前（アクセシブル名と隠しテーブルの見出しに使われます） |

### `flow` — 順序のある段階

```html
<div data-infograph="flow" data-ig-fragment="steps">
  <div data-step="課題">分断されたチーム</div>
  <div data-step="介入">文化統合</div>
  <div data-step="結果">リードタイム 66% 短縮</div>
</div>
```

段階の間には必ず矢印が入ります。横並びの箱は「グループ」と読まれてしまうので、方向を明示する
ものが必要だからです。`data-ig-fragment="steps"` を付けると、1 段階ずつ reveal の fragment に
なります。

### `compare` — 2 時点の対比

```html
<div data-infograph="compare" data-label="平均リードタイム">
  <div data-item="導入前" data-value="18日"></div>
  <div data-item="導入後" data-value="6日"></div>
</div>
```

**差分（`-12日 / -66.7%`）は自動で計算されます。** それがスライドの主張そのものだからです。
暗算を聴衆に任せると、全員が違う速度で計算している間に話が次へ進みます。

既定では 2 つ目（＝多くの場合の主張）が強調されます。`data-emphasis="1"` で移せます。
基線が 0 以下のときは相対変化を出しません（意味のない数になるため）。

### `venn` — 重なりが主題のとき

```html
<div
  data-infograph="venn"
  data-overlap="0.35"
  data-a="内製開発"
  data-b="グローバル化"
  data-ab="文化統合"
></div>
```

交差は clip で切り出した本物のレンズ形です。第 3 の円を上に浮かせる描き方は「2 つに隣接する
第 3 のカテゴリ」に見えてしまい、主張と食い違います。

| 属性              | 意味                                |
| ----------------- | ----------------------------------- |
| `data-a` `data-b` | 2 つの集合の名前                    |
| `data-ab`         | 交差部分の名前                      |
| `data-overlap`    | 0〜1。0 で離れ、1 で一致。既定 0.35 |

3 円は描きません（7 領域は講演中に解けないため）。2 枚の図に分けるほうが伝わります。

### `auto` — 意図からフォームを選ばせる

```html
<div data-infograph="auto" data-intent="part-of-whole" data-value="62%" data-label="定着率"></div>
```

| `data-intent`   | 解決先                      | 理由                           |
| --------------- | --------------------------- | ------------------------------ |
| `compare`       | `bar`（2 項なら `compare`） | 共通基線上の長さ               |
| `part-of-whole` | `waffle`                    | 角度ではなく数えられるグリッド |
| `change`        | `compare`                   | 2 時点を固定して差分を出す     |
| `flow`          | `flow`                      | 明示的な連結子つきの順序       |
| `overlap`       | `venn`                      | 面積が主題である唯一のケース   |
| `single`        | `stat`                      | 図ではなく文字                 |

---

## 挙動オプション（`data-ig-*` とデッキ設定）

デッキ全体の既定値は reveal の設定から渡します。

```js
initReveal({
  infograph: { duration: 700, density: 'compact' },
});
```

同じキーを 1 つの図だけで上書きするには `data-ig-*` を使います。

| キー        | `data-ig-*`          | 既定          | 意味                            |
| ----------- | -------------------- | ------------- | ------------------------------- |
| `palette`   | `data-ig-palette`    | `default`     | パレット名                      |
| `density`   | `data-ig-density`    | `comfortable` | `compact` で詰める              |
| `legend`    | `data-ig-legend`     | `false`       | 直接ラベルの代わりに凡例を出す  |
| `animate`   | `data-ig-animate`    | `true`        | 入場アニメーション              |
| `duration`  | `data-ig-duration`   | `600`         | アニメーション時間 (ms)         |
| `delay`     | `data-ig-delay`      | `100`         | スライド表示からの待ち時間 (ms) |
| `maxSeries` | `data-ig-max-series` | `4`           | これを超えると助言が出る        |
| `quiet`     | —                    | `false`       | 助言メッセージを止める          |

`data-ig-legend` のように値なしで書くと `true` の意味になります（reveal の `data-auto-animate`
と同じ書き味）。

すべてのフォームで `data-caption` によるキャプションが使えます。

---

## 助言メッセージについて

原則に反する記述をすると、**警告だけして描画はそのまま**行われます。

```
[infograph] bar has 6 items; more than 4 is hard to hold in mind
  → Show the top few and roll the rest into "その他", or split across slides.
```

10 分後に本番があるとき、完璧な図より動く図のほうが価値があるからです。止めたい場合は
`infograph: { quiet: true }` を設定してください。

---

## 他のプラグインとの併用

### count-up

数値は `.ig-stat-value` などのテキストとして出るので、`data-count-up` を付ければカウントアップ
します。

```html
<div data-infograph="stat" data-value="43.8%" data-label="同意" data-count-up></div>
```

ただし **auto-animate のペア対象には付けないでください**。reveal はラベルのない要素をテキスト
内容で対応付けることがあり、アニメーション中の書き換えと衝突します。

### auto-animate

`data-id` を書いておくと、生成要素にも安定した `data-id`（`ig-<id>-value` など）が振られ、
スライド間でモーフィングできます。

```html
<section data-auto-animate>
  <div data-infograph="venn" data-id="thesis" data-overlap="0.05" data-a="A" data-b="B"></div>
</section>
<section data-auto-animate>
  <div data-infograph="venn" data-id="thesis" data-overlap="0.55" data-a="A" data-b="B"></div>
</section>
```

デッキ側の設定で `center` を `false` にしないでください。reveal は `center: false` のとき
`offsetLeft` / `offsetWidth` で要素を測りますが、これらは SVG 要素には存在せず
`translate(NaNpx, NaNpx)` になって venn のアニメーションが黙って死にます。

---

## 独自フォームを足す

```js
import { registerForm, el, cls, figure } from 'revealjs-infograph';

registerForm('gauge', ({ host, config }) => {
  const value = host.dataset.value;
  return figure({
    form: 'gauge',
    label: `ゲージ ${value}`,
    visual: el('div', { class: cls('gauge') }, value),
  });
});
```

フォームは `(context) => HTMLElement` の純関数です。組み込みフォームと同じライフサイクル・
アニメーション・設定解決・アクセシビリティの枠組みがそのまま適用されます。

---

## 開発

```sh
npm ci
npm run dev              # examples/ を起動して全フォームを目視確認
npm test                 # vitest（happy-dom、reveal.js 非依存で 3 秒弱）
npm run test:watch
npm run lint
npm run typecheck        # JSDoc の型を checkJs で検査
npm run validate:palette # コントラスト比 / CVD ΔE の表を出力
npm run build            # dist/（IIFE + CSS）と types/ を生成
```

ユニットテストは reveal.js を一切読み込みません（`test/helpers/deck.js` が必要な 4 メソッドだけを
偽装します）。実物での確認は `examples/` の playground が担当し、これは GitHub Pages にも
デプロイされて生きたドキュメントになります。

### 視覚テスト

ユニットテストは happy-dom 上で走るため、**レイアウトを計算しません**。バーが共通基線上に
あるか、ラベルがマークの近くに描かれたか、交差が本当にレンズ形で塗られたかは、
実ブラウザでしか検証できません。それが `test/visual/` です。

```sh
npm run test:visual:docker  # 正。CI と同一のコンテナで実行
npm run test:visual         # ホスト直実行（速い。スクリーンショット比較は参考値）
npm run test:visual:update  # スクリーンショットのベースラインを更新
npm run test:visual:report  # 失敗時に diff を目視
```

3 種類のテストが入っています。

| ファイル              | 何を見るか                                                 | 環境依存 |
| --------------------- | ---------------------------------------------------------- | -------- |
| `principles.spec.js`  | 原則を幾何と色として直接アサート。ゴールデン画像を使わない | なし     |
| `integration.spec.js` | 実デッキ上の印刷 / 低モーション / fragment / auto-animate  | なし     |
| `screenshots.spec.js` | 見た目の回帰（誰もルールを書かなかった変化を拾う）         | あり     |

前 2 つは失敗すると「principle 1: bar left edges span 36.00px」のように**どの原則がどれだけ
破れたか**を数値で報告します。画像を見比べる必要はありません。原則と検証の対応は
[docs/principles.md](docs/principles.md) の各節「視覚検証」を参照してください。

スクリーンショットのベースラインだけは環境依存（フォントのラスタライズ差）なので、
Playwright 公式 Docker イメージの中でのみ生成します。詳細と現在のベースラインの出所は
[`test/visual/__screenshots__/PROVENANCE.md`](test/visual/__screenshots__/PROVENANCE.md)。

## ライセンス

MIT
