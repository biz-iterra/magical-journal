/**
 * エラーハンドリングミドルウェア。
 * 未捕捉エラーを JSON レスポンスに変換する。
 */

import type { ErrorHandler } from "hono";

/**
 * Hono の onError ハンドラ。
 * エラーの詳細は本番環境ではクライアントに露出しない。
 * 個人情報をログに出力しないよう、エラーメッセージのみ記録する。
 */
export const errorHandler: ErrorHandler = (err, c) => {
  const isDev = process.env.NODE_ENV === "development";

  // エラーログ(個人情報は含めない)
  console.error(`[API Error] ${err.message}`);
  if (isDev) {
    console.error(err.stack);
  }

  const status = "status" in err && typeof err.status === "number" ? err.status : 500;

  // 500 系は内部詳細を露出しない。共通コード MJ-SYS-001 を付与する。
  return c.json(
    {
      error: status >= 500 ? "サーバー内部エラーが発生しました" : err.message,
      code: status >= 500 ? "MJ-SYS-001" : undefined,
      ...(isDev ? { stack: err.stack } : {}),
    },
    status as 500,
  );
};
