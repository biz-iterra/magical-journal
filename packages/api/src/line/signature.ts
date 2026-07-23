/**
 * LINE Messaging API の Webhook 署名検証。
 *
 * LINE は `X-Line-Signature` ヘッダに、リクエスト raw ボディを
 * チャネルシークレットで HMAC-SHA256 → Base64 した値を載せて送る。
 * これを再計算し、タイミング安全比較で照合する。
 *
 * テスト可能な純関数として分離している(実 LINE / ネットワーク非依存)。
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE Webhook の署名を検証する。
 *
 * @param channelSecret チャネルシークレット(空なら常に false)
 * @param rawBody       リクエストの生ボディ(パース前の文字列)
 * @param signature     `X-Line-Signature` ヘッダ値(未設定なら false)
 * @returns 署名が一致すれば true
 */
export function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string | undefined | null,
): boolean {
  if (!channelSecret || !signature) return false;

  const expected = createHmac("sha256", channelSecret).update(rawBody, "utf8").digest("base64");

  // タイミング安全比較。長さが違う場合 timingSafeEqual は例外を投げるため
  // 事前に長さを確認する(長さの不一致自体は秘密ではない)。
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
