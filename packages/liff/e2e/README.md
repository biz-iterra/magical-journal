# LIFF フロント E2E (Playwright)

モバイルビューポート (375x812 + タッチ) で LIFF フロントの Phase 1 シナリオを検証する。

## 前提 (Playwright の外で用意するもの)

1. **API コンテナ** `mj-api` を **dev モード** で port 3000 に起動しておく:
   ```bash
   docker build -q -f infra/Dockerfile.api -t mj-api-test .
   docker rm -f mj-api
   MSYS_NO_PATHCONV=1 docker run -d --name mj-api -p 3000:3000 \
     -e NODE_ENV=development -e DATABASE_PATH=/tmp/mj.sqlite mj-api-test
   ```
   dev モードは許可リスト無効・`dev:<userId>` トークンを受理する。
2. Vite dev サーバー (port 5173) は `playwright.config.ts` の `webServer` が自動起動する
   (`reuseExistingServer: true` なので既存があれば再利用)。

## 実行

```bash
pnpm --filter @mj/liff e2e            # 全シナリオ
pnpm --filter @mj/liff e2e:report     # HTML レポート表示
```

## DB リセットの扱い

- `e2e/global-setup.ts` が起動時に **best-effort で DB をリセット** する
  (`docker rm -f mj-api` → 空 DB で再起動)。docker/bash が使えない環境では
  警告のみでスキップする。
- テストは **DB 状態に依存し順序が重要** なため `workers: 1` / `fullyParallel: false`
  で直列実行する。ファイル番号順:
  1. `01-guard` … 空 DB で未登録ガード (/register リダイレクト)
  2. `02-register` … 新規登録 → mock-user を作成 → マイタイプ基準値
  3. `03-today` … 登録済み再訪 (今日のページ・盤タブ)
  4. `04-friend` … 友達診断 (端末内完結 / API 非送信を厳密検証) ※DB 非依存
  5. `05-settings` … 設定 (キャラスタイル変更の保存)
- docker リセットが使えない場合でも、**クリーンな空 DB で API を起動した直後なら
  「1 回通し」で全 green** になる (再実行時は API を空 DB で起動し直すこと)。
  `MJ_SKIP_DB_RESET=1` で明示的にリセットを無効化できる。

## 対象外 (実機チェックリスト docs/09 へ)

- 実機 LINE / 本物の ID トークン / Flex カードの実機レンダリング
- 方位マップ (地図描画): dev は Maps キー未設定で座標なし登録のため地図は非表示。
  `RefererNotAllowedMapError` は想定内で、方位グリッドと盤データがあれば合格とする。
- 「E2E green = リリース可」ではない。docs/09 の人手チェック合格が別途必要。
