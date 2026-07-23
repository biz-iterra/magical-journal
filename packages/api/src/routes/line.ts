/**
 * POST /line/webhook — LINE Messaging API の Webhook 受け口。
 *
 * ★このルートは /api/* の LIFF 認証ミドルウェアの外側に置く(app.ts)。
 *   LINE は LIFF ID トークンではなく X-Line-Signature を送るため。
 *
 * 流れ:
 *   1. raw ボディを取得(署名は raw ボディに対して計算されるため text() で取る)
 *   2. チャネルシークレット未設定 → 503(構成不備。イベント処理しない)
 *   3. 署名検証失敗 → 401(タイミング安全比較。ログに残す)
 *   4. events を handleWebhookEvents で処理し、常に 200 を返す
 */

import { Hono } from "hono";
import { getDailyFortune, getDiagResult, getProfile, getUserByLineId } from "../db/queries.js";
import { getEnv } from "../env.js";
import { HttpLineClient } from "../line/client.js";
import { verifyLineSignature } from "../line/signature.js";
import {
  type LineWebhookEvent,
  type WebhookQueries,
  handleWebhookEvents,
} from "../line/webhook-handler.js";
import type { AppEnv } from "../types.js";

const line = new Hono<AppEnv>();

/** JST の当日日付を "YYYY-MM-DD" で返す(TZ 依存回避のため Intl を使用)。 */
function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/** 実 DB クエリを WebhookQueries インターフェースに束ねる。 */
const realQueries: WebhookQueries = {
  getUserByLineId,
  getProfile,
  getDiagResult,
  getDailyFortune,
};

line.post("/webhook", async (c) => {
  const env = getEnv();

  // 署名検証は raw ボディに対して行う。
  const rawBody = await c.req.text();
  const signature = c.req.header("X-Line-Signature");

  if (!env.lineChannelSecret) {
    console.error("[LINE] webhook rejected: LINE_CHANNEL_SECRET not configured");
    return c.text("webhook not configured", 503);
  }

  if (!verifyLineSignature(env.lineChannelSecret, rawBody, signature)) {
    console.error("[LINE] webhook rejected: invalid signature");
    return c.text("invalid signature", 401);
  }

  // 署名検証済みなのでパースして処理。
  let events: readonly LineWebhookEvent[] = [];
  try {
    const parsed = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
    events = parsed.events ?? [];
  } catch {
    // 署名は正しいが JSON でない(通常起きない)。空扱いで 200 を返す。
    console.error("[LINE] webhook body parse failed");
    return c.json({});
  }

  await handleWebhookEvents(events, {
    lineClient: new HttpLineClient(env.lineChannelAccessToken),
    config: { liffId: env.liffId, publicAssetBaseUrl: env.publicAssetBaseUrl },
    queries: realQueries,
    todayJST,
  });

  // LINE には常に 200 を返す(reply の成否は内部でログ)。
  return c.json({});
});

export default line;
