/**
 * GET /api/postal?zipcode=NNNNNNN
 *
 * 郵便番号 → 住所(都道府県+市区町村+町域)を返す。
 * 郵便番号検索 API(GitHub Pages でホストされた静的 JSON)をサーバー側で
 * プロキシする。ブラウザから直接叩くと CORS で失敗しうるため、サーバー経由。
 * 第三者サービスへ渡すのは郵便番号のみ(個人情報は渡さない)。
 */

import { Hono } from "hono";
import { fail } from "../errors.js";
import type { AppEnv } from "../types.js";

const postal = new Hono<AppEnv>();

/** jp-postal-code-api(ttskch)のレスポンス型(必要部分のみ) */
interface PostalApiResponse {
  readonly postalCode: string;
  readonly addresses: ReadonlyArray<{
    readonly ja: {
      readonly prefecture: string;
      readonly address1: string; // 市区町村
      readonly address2: string; // 町域
    };
  }>;
}

postal.get("/", async (c) => {
  const raw = c.req.query("zipcode") ?? "";
  const zipcode = raw.replace(/[^0-9]/g, "");

  if (zipcode.length !== 7) {
    return fail(c, "MJ-POST-001");
  }

  let data: PostalApiResponse;
  try {
    // 上流が無応答でもリクエストがハングしないようタイムアウトを設ける
    const res = await fetch(`https://jp-postal-code-api.ttskch.com/api/v1/${zipcode}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) {
      return fail(c, "MJ-POST-002");
    }
    if (!res.ok) {
      return fail(c, "MJ-POST-003");
    }
    data = (await res.json()) as PostalApiResponse;
  } catch {
    return fail(c, "MJ-POST-004");
  }

  const first = data.addresses?.[0]?.ja;
  if (!first) {
    return fail(c, "MJ-POST-002");
  }

  return c.json({
    zipcode,
    prefecture: first.prefecture,
    city: first.address1,
    town: first.address2,
    address: `${first.prefecture}${first.address1}${first.address2}`,
  });
});

export default postal;
