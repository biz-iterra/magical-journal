/**
 * 環境変数の読み取りと検証。
 * シークレットはすべて .env + Docker env 経由で注入する。
 */

export interface AppEnvVars {
  /** サーバーポート(デフォルト 3000) */
  readonly port: number;
  /** SQLite データベースファイルパス */
  readonly databasePath: string;
  /** LINE Login チャネル ID(IDトークン検証用) */
  readonly lineLoginChannelId: string;
  /** 許可済み LINE ユーザー ID のリスト */
  readonly allowedLineUserIds: readonly string[];
  /** 実行環境 */
  readonly nodeEnv: string;
}

let cached: AppEnvVars | undefined;

/**
 * 環境変数を読み取り、検証して返す。
 * 2回目以降はキャッシュを返す。
 *
 * @throws 必須の環境変数が未設定の場合(開発モードでは LINE 系は任意)
 */
export function getEnv(): AppEnvVars {
  if (cached) return cached;

  const nodeEnv = process.env.NODE_ENV ?? "production";
  const isDev = nodeEnv === "development";

  const port = Number(process.env.PORT ?? "3000");
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid port number (1-65535)");
  }

  const databasePath = process.env.DATABASE_PATH;
  if (!databasePath) {
    throw new Error("DATABASE_PATH is required");
  }

  const lineLoginChannelId = process.env.LINE_LOGIN_CHANNEL_ID ?? "";
  if (!isDev && !lineLoginChannelId) {
    throw new Error("LINE_LOGIN_CHANNEL_ID is required in production");
  }

  const allowedRaw = process.env.ALLOWED_LINE_USER_IDS ?? "";
  const allowedLineUserIds = allowedRaw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  cached = {
    port,
    databasePath,
    lineLoginChannelId,
    allowedLineUserIds,
    nodeEnv,
  };

  return cached;
}

/** テスト用: キャッシュをクリアする */
export function resetEnvCache(): void {
  cached = undefined;
}
