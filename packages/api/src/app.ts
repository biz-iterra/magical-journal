/**
 * Hono アプリのルート定義。
 * テスト用に index.ts(サーバー起動)と分離している。
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import diagnosis from "./routes/diagnosis.js";
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
      // ローカル開発: http://localhost:*
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
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

// ── 認証ミドルウェア ────────────────────────────────────────

app.use("/api/*", authMiddleware);

// ── ルートマウント ──────────────────────────────────────────

app.route("/api/register", register);
app.route("/api/profile", profile);
app.route("/api/diagnosis", diagnosis);
app.route("/api/today", today);

export default app;
