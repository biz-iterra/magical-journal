/**
 * 郵便番号 → 住所検索。
 * API サーバー(/api/postal)経由で zipcloud を呼ぶ(CORS 回避)。
 */

import { apiClient } from "../api/client";

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
    throw new Error("郵便番号は7桁で入力してください");
  }
  return apiClient.get<PostalResult>(`/api/postal?zipcode=${digits}`);
}
