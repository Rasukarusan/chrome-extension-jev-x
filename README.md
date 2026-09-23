# AI驚き屋スタンプ

X（Twitter）のタイムラインに流れてくる投稿を、判断専用 AI [Jev](https://docs.typesafe.ai)（TypeSafe AI）で判定し、熱盛風のスタンプをドンと押す Chrome 拡張。AI驚き屋には「驚屋（オドロキヤ）」、それ以外には「見ろ！」を押す。

## 使い方

```sh
npm install
npm run build
```

1. `chrome://extensions` でデベロッパーモードを ON にし、「パッケージ化されていない拡張機能を読み込む」で `dist/` を選ぶ
2. 設定画面が開くので、[TypeSafe Console](https://console.typesafe.ai) で発行した API キーを保存する
3. x.com を開いてスクロールする

スタンプをクリックすると判定の内訳が出て、「スタンプをはがす」で消せる。

## 判定の仕組み

1 投稿につき 1 回 Jev を呼び、5 つの問いを同時に投げる（`src/background/judge.ts`）。

| 問い | 型 | 意味 |
| --- | --- | --- |
| `aboutAi` | noul | AI の話題か |
| `hype` | score (0–4) | 誇張・煽りの強さ |
| `fomo` | noul | 「絶対見るべき」「置いていかれる」と焦らせているか |
| `bait` | noul | いいね・リプ欄誘導などのエンゲージメント乞いか |
| `substance` | noul | 検証結果・数値・限界の言及など中身があるか |

合成はコード側で行う。AI の話題（`aboutAi` が 0.5 以上）なら 0.6 から始まり、煽り度を上乗せする。

```
煽り度   = 0.4 × hype + 0.3 × fomo + 0.15 × bait + 0.15 × (1 − substance)
驚き屋度 = 0.6 + 0.4 × 煽り度 (+ 0.1 Jev に言及していれば)
```

- AI の話題は必ず驚屋になり、煽りが強ければ特級になる
- 本文に「Jev」「ジェブ」「TypeSafe」があれば、AI の話題かどうかを問わず驚屋にし、さらに 0.1 上乗せする。文字列の検出は正規表現で行う
- それ以外の投稿は驚き屋度 0 で「見ろ！」になる

驚き屋度が「認定の厳しさ」（既定 55%）以上なら驚屋、その値と 100% の中間以上なら炎つきの特級驚屋、未満なら「見ろ！」になる。15 文字未満の投稿と広告は判定せず、スタンプも押さない。

## 構成

```
src/
  background/   Service Worker。Jev 呼び出し、同時実行数制御、判定キャッシュ
  content/      x.com 上で投稿を抽出し、スタンプを Shadow DOM で描画
  options/      設定画面（API キー・厳しさ・試し判定）
  shared/       型・設定・スタンプ段階の算出
```

- API キーは Service Worker だけが使い、X のページには渡らない
- 判定は投稿が画面に近づいた時点で先読みし、スタンプは投稿が画面に 6 割入った瞬間に押す
- 判定結果は投稿 ID ごとに `chrome.storage.session` に保存し、同じ投稿は再判定しない
- 投稿本文は判定のため TypeSafe の API に送信される

## 開発

```sh
npm run watch      # dist/ を監視ビルド
npm run typecheck
npm test
```
