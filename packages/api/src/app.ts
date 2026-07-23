/**
 * Hono アプリのルート定義。
 * テスト用に index.ts(サーバー起動)と分離している。
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEnv } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import diagnosis from "./routes/diagnosis.js";
import line from "./routes/line.js";
import monthly from "./routes/monthly.js";
import personality from "./routes/personality.js";
import postal from "./routes/postal.js";
import profile from "./routes/profile.js";
import register from "./routes/register.js";
import today from "./routes/today.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

// ── CORS ────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      // Cloudflare Pages: *.pages.dev
      if (origin.endsWith(".pages.dev") && origin.startsWith("https://")) {
        return origin;
      }
      // Cloudflare Workers(静的アセット配信): *.workers.dev
      if (origin.endsWith(".workers.dev") && origin.startsWith("https://")) {
        return origin;
      }
      // ローカル開発: http://localhost:*
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return origin;
      }
      // 環境変数で追加許可されたオリジン(カスタムドメイン等)
      if (getEnv().allowedOrigins.includes(origin)) {
        return origin;
      }
      return undefined;
    },
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

// ── エラーハンドリング ──────────────────────────────────────

app.onError(errorHandler);

// ── ヘルスチェック(認証不要) ────────────────────────────────

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

// ── LINE Webhook(認証不要・/api/* の外側) ────────────────────
// LINE は LIFF トークンではなく X-Line-Signature で認証するため、
// authMiddleware(/api/*)の配下に入れずにマウントする。署名検証はルート内で行う。

app.route("/line", line);

// ── 認証ミドルウェア ────────────────────────────────────────

app.use("/api/*", authMiddleware);

// ── ルートマウント ──────────────────────────────────────────

app.route("/api/register", register);
app.route("/api/profile", profile);
app.route("/api/diagnosis", diagnosis);
app.route("/api/postal", postal);
app.route("/api/today", today);
app.route("/api/monthly", monthly);
app.route("/api/personality", personality);

export default app;
