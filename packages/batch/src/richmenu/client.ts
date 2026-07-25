/**
 * LINE Messaging API のリッチメニュー系エンドポイントを叩く薄いクライアント。
 *
 * アクセストークンはコンストラクタ経由で env から注入する(CLAUDE.md ルール4:
 * ハードコード禁止)。**トークンはログ・例外メッセージに絶対に含めない。**
 * エラーは握りつぶさず、HTTP ステータスと LINE のエラー本文を例外に載せる
 * (LINE のエラー本文にトークンは含まれない)。
 *
 * packages/api/src/line/client.ts と同じ思想(fetch + Bearer + 失敗時 throw)だが、
 * あちらは reply 専用のため、運用スクリプト用に本ファイルを分けている。
 */

import type { RichMenuObject } from "./definition.js";

const API_BASE = "https://api.line.me/v2/bot";
const DATA_API_BASE = "https://api-data.line.me/v2/bot";

/** GET /v2/bot/richmenu/list のレスポンス要素(必要なものだけ) */
export interface RichMenuSummary {
  readonly richMenuId: string;
  readonly name: string;
  readonly chatBarText: string;
}

/** リッチメニュー操作のインターフェース(テストで差し替え可能に) */
export interface RichMenuApi {
  create(menu: RichMenuObject): Promise<string>;
  uploadImage(richMenuId: string, image: Uint8Array, contentType: string): Promise<void>;
  setDefault(richMenuId: string): Promise<void>;
  list(): Promise<readonly RichMenuSummary[]>;
  remove(richMenuId: string): Promise<void>;
}

/** レスポンス本文を安全に取り出す(失敗しても例外にしない) */
async function safeBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 1000);
  } catch {
    return "<レスポンス本文の読み取りに失敗>";
  }
}

/** 失敗レスポンスを例外に変換する。トークンは含めない。 */
async function toError(operation: string, res: Response): Promise<Error> {
  const body = await safeBody(res);
  return new Error(`LINE ${operation} failed: HTTP ${String(res.status)} ${body}`);
}

/** 実 LINE Messaging API に接続するリッチメニュークライアント */
export class HttpRichMenuApi implements RichMenuApi {
  readonly #accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken.trim()) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required");
    }
    this.#accessToken = accessToken;
  }

  get #authHeader(): string {
    return `Bearer ${this.#accessToken}`;
  }

  /** POST /v2/bot/richmenu → richMenuId */
  async create(menu: RichMenuObject): Promise<string> {
    const res = await fetch(`${API_BASE}/richmenu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.#authHeader,
      },
      body: JSON.stringify(menu),
    });
    if (!res.ok) throw await toError("richmenu create", res);

    const json = (await res.json()) as { richMenuId?: string };
    if (!json.richMenuId) {
      throw new Error("LINE richmenu create returned no richMenuId");
    }
    return json.richMenuId;
  }

  /** POST /v2/bot/richmenu/{id}/content(画像アップロードは api-data ホスト) */
  async uploadImage(richMenuId: string, image: Uint8Array, contentType: string): Promise<void> {
    const res = await fetch(`${DATA_API_BASE}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: this.#authHeader,
      },
      // Uint8Array をそのまま body に渡す(BodyInit 互換)
      body: image,
    });
    if (!res.ok) throw await toError("richmenu image upload", res);
  }

  /** POST /v2/bot/user/all/richmenu/{id}(デフォルトリッチメニューとして全ユーザーに適用) */
  async setDefault(richMenuId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/user/all/richmenu/${richMenuId}`, {
      method: "POST",
      headers: { Authorization: this.#authHeader },
    });
    if (!res.ok) throw await toError("set default richmenu", res);
  }

  /** GET /v2/bot/richmenu/list */
  async list(): Promise<readonly RichMenuSummary[]> {
    const res = await fetch(`${API_BASE}/richmenu/list`, {
      headers: { Authorization: this.#authHeader },
    });
    if (!res.ok) throw await toError("richmenu list", res);

    const json = (await res.json()) as { richmenus?: readonly RichMenuSummary[] };
    return json.richmenus ?? [];
  }

  /** DELETE /v2/bot/richmenu/{id} */
  async remove(richMenuId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/richmenu/${richMenuId}`, {
      method: "DELETE",
      headers: { Authorization: this.#authHeader },
    });
    if (!res.ok) throw await toError("richmenu delete", res);
  }
}
