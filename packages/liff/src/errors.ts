/**
 * フロントエンド(クライアント側)で発生するエラーのコードカタログと整形ヘルパー。
 *
 * API 由来のエラーは API 側のコード(MJ-AUTH-*, MJ-POST-* など)がそのまま
 * 表示される(client.ts で整形)。ここで定義するのは端末内・地図・LIFF 初期化など
 * クライアント側でのみ発生するエラー。
 *
 * 一覧・意味・対処法は docs/12_APIリファレンス・エラーコード.md を参照。
 */

export const CLIENT_ERRORS = {
  // ── 通信 ────────────────────────────────────────────────
  "MJ-NET-001": "サーバーとの通信に失敗しました",

  // ── 地図・住所 ──────────────────────────────────────────
  "MJ-MAP-001": "地図サービスのAPIキーが設定されていません",
  "MJ-MAP-002": "住所から位置を特定できませんでした。市区町村からの住所をご確認ください",
  "MJ-MAP-003": "地図の読み込みに失敗しました",

  // ── LIFF ────────────────────────────────────────────────
  "MJ-LIFF-001": "LINEログイン情報の取得に失敗しました",
} as const;

export type ClientErrorCode = keyof typeof CLIENT_ERRORS;

/**
 * ユーザー表示用にメッセージとコードを「メッセージ(コード)」形式へ整形する。
 */
export function formatError(message: string, code: string): string {
  return `${message}(${code})`;
}

/**
 * クライアントエラーコードから整形済みメッセージ(メッセージ(コード))を返す。
 */
export function clientError(code: ClientErrorCode): string {
  return formatError(CLIENT_ERRORS[code], code);
}
