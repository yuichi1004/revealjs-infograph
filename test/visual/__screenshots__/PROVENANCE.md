# ベースライン画像の出所

**現在コミットされている PNG は `mcr.microsoft.com/playwright:v1.62.1-noble` コンテナ内で
生成されたものです**（`npm run test:visual:update` → `scripts/visual-docker.sh`）。CI もこの
イメージを使うため、`maxDiffPixels: 0` のまま運用できます。

再生成する場合は同じコマンドを実行してください。

```sh
npm run test:visual:update
git add test/visual/__screenshots__
git commit -m "Regenerate visual baselines in the pinned container"
```

## docker が使えない場合

`scripts/visual-docker.sh` は `docker` グループに実行ユーザが属していることを前提にしています
（`sudo usermod -aG docker "$USER"` の後、再ログインまたは `newgrp docker` が必要）。docker
グループへの追加は実質的に root 相当の権限を与えるため、判断はリポジトリの所有者に委ねます。
付与しない場合は、CI の visual ジョブが生成した画像（失敗時に `playwright-report` アーティ
ファクトとして添付されます）を取り込む運用でも成立します。

## 差分閾値を緩めない理由

`playwright.config.js` は `maxDiffPixels: 0` です。フォント差を吸収できる程度まで閾値を
上げると、本物の小さな退化（1px のズレ、わずかな色の変化）も同時に吸収してしまいます。
環境を固定するほうが、閾値を調整するより確実です。

なお **`principles.spec.js` と `integration.spec.js` はこの問題の影響を受けません**。これらは
ピクセルではなく幾何と色を測っており、環境非依存です。視覚的な原則検証という本題は、
ベースラインの出所に関係なく機能します。
