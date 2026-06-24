# 請求書ツール — 編集＆再公開の手順

このリポジトリの公開ファイルは `index.html`（1ファイル完結・自己完結）です。
`index.html` は最小化された自動生成物なので、**直接は編集しません**。
編集は `src/app.jsx`（このReactソース）を直して、再ビルドします。

## 構成
- `index.html` … 公開される本体（src/app.jsx をビルドしたもの）。GitHub Pagesが配信。
- `src/app.jsx` … 編集元のReactソース（人が編集するのはこちら）。
- `src/BUILD.md` … この手順書。

## 公開URL
https://yasu-topica.github.io/invoice/

## ビルド方法（React → 単一HTML）
Node環境で:
```
mkdir build && cd build && npm init -y
npm install react@18 react-dom@18 lucide-react
npm install --save-dev esbuild
# app.jsx を build/src/ に置く
npx esbuild src/app.jsx --bundle --minify --format=iife --jsx=automatic \
  --define:process.env.NODE_ENV='"production"' --outfile=dist/bundle.js
```
できた `dist/bundle.js` を、次のHTMLの <script> 内に丸ごと挿入して `index.html` を作る:
```
<!DOCTYPE html><html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>請求書作成ツール | 株式会社トピカ</title>
<meta name="robots" content="noindex,nofollow">
<script src="https://cdn.tailwindcss.com"></script>
<style>html,body{margin:0;padding:0}</style>
</head><body><div id="root"></div>
<script> /* ここに dist/bundle.js の中身 */ </script>
</body></html>
```

## 反映方法
`index.html` をこのリポジトリのルートに上書きアップロード（Commit）すれば、
1〜2分後に公開URLへ自動反映されます。

## 設計メモ（セキュリティ）
- データの外部送信なし（fetch/XHR/Firebase等を一切使わない）。
- 「自社情報を記憶」は localStorage（利用者のブラウザ内のみ）。キー: topica-invoice-defaults-v1
- 宛名は「株式会社トピカ」固定。顧客情報は保持しない。
