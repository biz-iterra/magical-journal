/**
 * API エラーコードのカタログ。
 *
 * すべてのエラー応答は { error: メッセージ, code: コード } の形で返す。
 * コードの一覧・意味・対処法は docs/12_APIリファレンス・エラーコード.md を参照。
 * 新しいエラーを追加したら必ずこのカタログとドキュメントの両方を更新すること。
 */

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiErrorDef {
  readonly status: ContentfulStatusCode;
  readonly message: string;
}

export const API_ERRORS = {
  // ── 認証・認可 ──────────────────────────────────────────
  "MJ-AUTH-001": { status: 401, message: "認証情報がありません" },
  "MJ-AUTH-002": { status: 401, message: "開発用トークンの形式が不正です" },
  "MJ-AUTH-003": { status: 401, message: "認証トークンの検証に失敗しました" },
  "MJ-AUTH-004": { status: 403, message: "このアカウントは利用が許可されていません" },

  // ── ユーザー・プロフィール共通 ──────────────────────────
  "MJ-USER-404": { status: 404, message: "ユーザーが登録されていません" },
  "MJ-PROFILE-404": { status: 404, message: "プロフィールが登録されていません" },

  // ── 登録 ────────────────────────────────────────────────
  "MJ-REG-001": { status: 400, message: "必須項目が入力されていません" },
  "MJ-REG-002": { status: 400, message: "表示スタイルの指定が不正です" },
  "MJ-REG-003": { status: 400, message: "生年月日の形式が不正です" },
  "MJ-REG-004": { status: 400, message: "出生時刻の形式が不正です" },
  "MJ-REG-409": { status: 409, message: "すでに登録済みです" },

  // ── プロフィール更新 ────────────────────────────────────
  "MJ-PROF-001": { status: 400, message: "表示スタイルの指定が不正です" },
  "MJ-PROF-002": { status: 400, message: "出生時刻の形式が不正です" },

  // ── 郵便番号検索 ────────────────────────────────────────
  "MJ-POST-001": { status: 400, message: "郵便番号は7桁で入力してください" },
  "MJ-POST-002": { status: 404, message: "該当する住所が見つかりませんでした" },
  "MJ-POST-003": { status: 502, message: "郵便番号検索サービスでエラーが発生しました" },
  "MJ-POST-004": { status: 502, message: "郵便番号検索サービスに接続できませんでした" },

  // ── システム ────────────────────────────────────────────
  "MJ-SYS-001": { status: 500, message: "サーバー内部エラーが発生しました" },
} as const satisfies Record<string, ApiErrorDef>;

export type ApiErrorCode = keyof typeof API_ERRORS;

/**
 * エラーコードから JSON エラー応答を返す。
 * 応答ボディは { error, code }、HTTP ステータスはカタログ定義に従う。
 */
export function fail(c: Context, code: ApiErrorCode) {
  const def = API_ERRORS[code];
  return c.json({ error: def.message, code }, def.status);
}
