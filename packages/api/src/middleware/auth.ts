/**
 * LIFF IDトークン検証ミドルウェア。
 *
 * - LINE の ID トークン検証 API を呼び出してトークンを検証
 * - 検証成功 → lineUserId をコンテキストにセット
 * - 許可リスト(ALLOWED_LINE_USER_IDS)チェック
 * - 開発モード: `Authorization: Bearer dev:USER_ID` 形式で検証をスキップ
 */

import { createMiddleware } from "hono/factory";
import { getEnv } from "../env.js";
import { fail } from "../errors.js";
import type { AppEnv } from "../types.js";

/** LINE ID トークン検証 API のレスポンス型(必要最小限) */
interface LineVerifyResponse {
  readonly sub?: string;
  readonly error?: string;
  readonly error_description?: string;
}

/**
 * LINE の IDトークン検証 API を呼び出す。
 * テスト時にモック可能なよう、関数として分離している。
 */
export async function verifyLineIdToken(
  idToken: string,
  channelId: string,
): Promise<LineVerifyResponse> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  return (await res.json()) as LineVerifyResponse;
}

/**
 * 認証ミドルウェア。
 * Authorization ヘッダーの Bearer トークンを検証し、
 * lineUserId をコンテキストにセットする。
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const env = getEnv();
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return fail(c, "MJ-AUTH-001");
  }

  const token = authHeader.slice(7);

  let lineUserId: string;

  // 開発モード: dev:USER_ID 形式
  if (env.nodeEnv === "development" && token.startsWith("dev:")) {
    lineUserId = token.slice(4);
    if (!lineUserId) {
      return fail(c, "MJ-AUTH-002");
    }
  } else {
    // 本番: LINE IDトークン検証
    const result = await verifyLineIdToken(token, env.lineLoginChannelId);

    if (result.error || !result.sub) {
      return fail(c, "MJ-AUTH-003");
    }

    lineUserId = result.sub;
  }

  // 許可リストチェック(クローズド運用)。
  // 本番で許可リストが空なら構成ミスとみなしフェイルクローズ(全拒否)する。
  // 開発モードのみ空リスト=全員許可を許容する(ローカル検証のため)。
  const isDev = env.nodeEnv === "development";
  if (env.allowedLineUserIds.length === 0) {
    if (!isDev) {
      return fail(c, "MJ-AUTH-004");
    }
  } else if (!env.allowedLineUserIds.includes(lineUserId)) {
    return fail(c, "MJ-AUTH-004");
  }

  c.set("lineUserId", lineUserId);
  await next();
});
