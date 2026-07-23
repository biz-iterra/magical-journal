import { execSync } from "node:child_process";

/**
 * E2E グローバルセットアップ
 *
 * 1. DB リセット (best-effort): docker で mj-api コンテナを空 DB で再起動する。
 *    - docker が使えない環境ではスキップし、警告のみ (順序依存で「1 回通し」なら通る)。
 *    - MJ_SKIP_DB_RESET=1 で明示スキップ可。
 * 2. /api/health の疎通確認 (必須): 繋がらなければ分かりやすく throw して全テストを止める。
 *
 * API コンテナは Playwright の外で管理する前提。ここでの再起動はあくまでテスト独立性
 * (未登録ガード → 新規登録 の順で毎回クリーンに通す) のための補助。
 */

const HEALTH_URL = "http://localhost:3000/api/health";

// docker を直接呼ぶ (bash 非依存 / Windows でも PATH 上の docker を使う)。
// node から直接起動すれば MSYS のパス変換も起きないため /tmp/... は素通しになる。
const RESET_STEPS = [
  "docker rm -f mj-api",
  "docker run -d --name mj-api -p 3000:3000 " +
    "-e NODE_ENV=development -e DATABASE_PATH=/tmp/mj.sqlite mj-api-test",
];

async function waitForHealth(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return true;
    } catch {
      // まだ起動中
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export default async function globalSetup(): Promise<void> {
  // ── 1. DB リセット (best-effort) ──────────────────────────
  if (process.env.MJ_SKIP_DB_RESET === "1") {
    console.warn("[e2e] MJ_SKIP_DB_RESET=1: DB リセットをスキップします");
  } else {
    try {
      // 既存コンテナ削除は失敗しても無視 (未起動なら rm は非0終了する)
      try {
        execSync(RESET_STEPS[0], { stdio: "ignore", timeout: 30_000 });
      } catch {
        /* コンテナ未存在 */
      }
      execSync(RESET_STEPS[1], { stdio: "ignore", timeout: 60_000 });
      console.warn("[e2e] DB をリセットしました (mj-api を空 DB で再起動)");
    } catch {
      console.warn(
        "[e2e] DB リセットをスキップ (docker 不可)。" +
          "クリーンな空 DB で API を起動済みであれば 1 回通しで通ります。",
      );
    }
  }

  // ── 2. /api/health 疎通確認 (必須) ────────────────────────
  const healthy = await waitForHealth(20_000);
  if (!healthy) {
    throw new Error(
      `[e2e] API (${HEALTH_URL}) に接続できません。\n` +
        "  E2E は外部で起動した API コンテナ (mj-api / port 3000) を前提とします。\n" +
        "  起動例: docker run -d --name mj-api -p 3000:3000 " +
        "-e NODE_ENV=development -e DATABASE_PATH=/tmp/mj.sqlite mj-api-test",
    );
  }
  console.warn("[e2e] API health OK — テストを開始します");
}
