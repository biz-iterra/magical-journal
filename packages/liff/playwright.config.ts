import { defineConfig, devices } from "@playwright/test";

/**
 * マジカルジャーナル LIFF フロント E2E 設定
 *
 * 【前提】
 * - API コンテナ (mj-api / http://localhost:3000) は **Playwright の外** で起動しておくこと。
 *   dev モード (NODE_ENV=development, 許可リスト無効) を想定。
 *   起動: docker run -d --name mj-api -p 3000:3000 \
 *           -e NODE_ENV=development -e DATABASE_PATH=/tmp/mj.sqlite mj-api-test
 * - LIFF dev サーバー (Vite / http://localhost:5173) は下の webServer 設定で自動起動する。
 *   Vite proxy が /api を localhost:3000 に転送する。
 * - globalSetup で /api/health の疎通を確認し、繋がらなければ即 fail させる。
 *   併せて DB リセット (docker 再起動) を best-effort で試みる (詳細は e2e/global-setup.ts / e2e/README.md)。
 *
 * 【ビューポート】
 * LINE 内ブラウザ相当のモバイル (375x812) + タッチエミュレーションのみ。
 * モバイル専用アプリのため PC ビューポートのテストは行わない。
 */
export default defineConfig({
  testDir: "./e2e",
  // 登録系テストは DB 状態に依存し順序が重要なため直列実行する
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  outputDir: "./e2e/test-results",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:5173",
    // モバイル (LINE 内ブラウザ相当) + タッチ
    ...devices["iPhone 12"],
    // devices の viewport は 390x844。docs/09 E-10 の 375x812 に合わせる
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "mobile-chromium",
      use: { browserName: "chromium" },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
