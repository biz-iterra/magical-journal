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

  return c.json(
    {
      error: status >= 500 ? "Internal server error" : err.message,
      ...(isDev ? { stack: err.stack } : {}),
    },
    status as 500,
  );
};
