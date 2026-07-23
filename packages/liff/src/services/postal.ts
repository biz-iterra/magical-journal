/**
 * 郵便番号 → 住所検索。
 * API サーバー(/api/postal)経由で郵便番号検索 API(jp-postal-code-api)を
 * 呼ぶ(ブラウザからの直接呼び出しは CORS で失敗するため)。
 */

import { apiClient } from "../api/client";
import { formatError } from "../errors";

export interface PostalResult {
  readonly zipcode: string;
  readonly prefecture: string;
  readonly city: string;
  readonly town: string;
  readonly address: string;
}

/**
 * 7桁の郵便番号(ハイフンあり/なし両対応)から住所を検索する。
 * @throws 桁数不正・該当なし・通信失敗の場合
 */
export async function lookupPostalCode(zipcode: string): Promise<PostalResult> {
  const digits = zipcode.replace(/[^0-9]/g, "");
  if (digits.length !== 7) {
    // 同条件のサーバー側検証(MJ-POST-001)とコードを揃える
    throw new Error(formatError("郵便番号は7桁で入力してください", "MJ-POST-001"));
  }
  return apiClient.get<PostalResult>(`/api/postal?zipcode=${digits}`);
}
