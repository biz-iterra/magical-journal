/**
 * LINE Messaging API クライアントの抽象化。
 *
 * テストで実 API を叩かないよう `LineClient` インターフェースに切り出す。
 * 本番は `HttpLineClient` が reply エンドポイントへ POST する。
 *
 * シークレット(アクセストークン)はコンストラクタ経由で env から注入し、
 * ログには出力しない(CLAUDE.md ルール4)。
 */

/** LINE メッセージオブジェクト(text / flex を最小限で表現) */
export type LineMessage =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "flex"; readonly altText: string; readonly contents: unknown };

/** LINE クライアント共通インターフェース */
export interface LineClient {
  /**
   * reply トークンに対して応答メッセージ(無料・無制限)を返信する。
   * 送信失敗時は例外を投げる(呼び出し側でログに残す)。
   */
  reply(replyToken: string, messages: readonly LineMessage[]): Promise<void>;
}

const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

/** 実 LINE Messaging API に接続するクライアント */
export class HttpLineClient implements LineClient {
  readonly #accessToken: string;

  constructor(accessToken: string) {
    this.#accessToken = accessToken;
  }

  async reply(replyToken: string, messages: readonly LineMessage[]): Promise<void> {
    const res = await fetch(LINE_REPLY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#accessToken}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });

    if (!res.ok) {
      // 応答本文にトークン等の秘密は含まれないが、念のため本文は載せず
      // ステータスのみをエラーに含める。
      throw new Error(`LINE reply failed: HTTP ${String(res.status)}`);
    }
  }
}
