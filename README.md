# うつろい — Smart Desk Clock

「読ませない、見せる」卓上時計。1280 × 720 / 7インチの横置き画面を基準に、時刻、空の色、一日の流れを一枚にまとめた静的Webアプリです。

- 大きな時刻・日付、秒の光のライン
- 気温・湿度・最高最低気温、SVG天気アイコン
- 右側に24時間の天気グラデーションと現在時刻マーカー
- 日の出・日の入り、昼の進行を表す太陽の軌道
- 月齢に応じた月の満ち欠け（平均朔望月による概算）
- 昼夜・天気に応じた背景。動きの軽減設定に対応
- 都市検索、タイムゾーン切り替え、全画面表示
- 15分ごとの天気更新、取得失敗時は前回データと「保存済み」を表示
- 初期地点は仙台。選択した場所はそのブラウザに保存

## GitHub Pages

リポジトリの **Settings → Pages → Build and deployment → Source → GitHub Actions** を選択してください。
その後 Actions の **Deploy clock to GitHub Pages → Run workflow** を実行します。以後は `main` へのpushでテスト・ビルド・公開します。

公開先: https://taogya.github.io/smart-desk-clock/

APIキー、バックエンド、ビルド用の追加依存パッケージは不要です。`index.html` と `src/` の相対パスを使用するため、Pagesのサブディレクトリで動作します。

## 開発

Node.js 22以降 / Python 3（ローカルサーバー用）。

```sh
npm run dev
# http://localhost:5173
npm test
npm run build
```

`dist/` が公開対象です。アプリ本体に外部JavaScript依存はありません。標準のJavaScript ES modules / CSS / SVGなので、アイコンやアニメーションライブラリの導入、フレームワークへの移行も可能です。

| ファイル | 役割 |
| --- | --- |
| `src/app.js` | 時計・描画・設定・更新処理 |
| `src/domain.js` | 日時・天気分類・月齢・月の描画計算 |
| `src/api.js` | API・保存済みデータ |
| `src/icons.js` | SVGアイコン |
| `src/style.css` | 色・文字・レイアウト・動き |
| `tests/domain.test.js` | 日付境界・DST・欠損値・月齢テスト |

1280×720を画面に合わせて縦横比を維持して拡縮します。スマートフォンの縦向きでは別レイアウトに切り替わります。7インチではブラウザの全画面表示を推奨します。

## データと精度

- 時刻と日付: 端末の時計。選択地点のIANAタイムゾーンで表示します。端末側の時刻同期を有効にしてください。
- 天気・日の出・日の入り: [Open-Meteo Forecast API](https://open-meteo.com/en/docs)。現在値は気象モデルによる推定値で、室内温湿度ではありません。
- 都市検索: [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)。都市名は英語でも検索可能です。
- 月齢: 2000-01-06 18:14 UTCを基準とする平均朔望月29.530588853日の近似。天文暦の厳密な月齢・月の地平線上の向きではありません。
- 太陽軌道: 日の出から日の入りの経過を表す模式図で、実際の太陽高度ではありません。極昼・極夜など時刻が返らない場合は未取得表示になります。
- 天気の24時間帯は現地の時刻で配置します。夏時間終了日の重複時刻は同じ位置になります。
- インターネット切断中も読み込み済み画面の時計は動作します。オフラインでの新規ページ読み込みを保証するPWAではありません。

Open-Meteoのデータは[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)に基づき、画面に出典を表示しています。無料APIは非商用用途向けです。商用化時は[利用規約](https://open-meteo.com/en/terms)を確認してください。
