/**
 * バッチの環境変数読み取りと検証。
 * シークレットはすべて .env + Docker env 経由で注入する(コードに含めない)。
 */

/** LLM プロバイダ種別 */
export type LlmProviderKind = "claude" | "openai" | "mock";

export interface BatchConfig {
  /** SQLite データベースファイルパス(api と共有) */
  readonly databasePath: string;
  /** 使用する LLM プロバイダ */
  readonly llmProvider: LlmProviderKind;
  /** Anthropic API キー(claude 使用時のみ必須) */
  readonly anthropicApiKey: string;
  /** OpenAI API キー(openai 使用時のみ必須) */
  readonly openaiApiKey: string;
  /** Claude モデル名(既定は現行 Sonnet)。config で差し替え可能 */
  readonly claudeModel: string;
  /** OpenAI モデル名(既定は現行)。config で差し替え可能 */
  readonly openaiModel: string;
  /** 生成の最大トークン数 */
  readonly llmMaxTokens: number;
  /** 夜間バッチの cron 式(既定 03:00) */
  readonly dailyCron: string;
  /** 月次バッチの cron 式(既定 毎月1日 03:30)。気学月キーで冪等なため日次で回しても安全 */
  readonly monthlyCron: string;
  /** cron のタイムゾーン(暦は JST 前提) */
  readonly cronTimezone: string;
  /**
   * Google Places API キー(サーバー用・リファラー制限なし)。
   * 未設定なら Places を使わず「方角ベースの一般提案(実在店名なし)」にフォールバックする。
   */
  readonly googlePlacesApiKey: string;
  /** 自宅から吉方位方向へオフセットする距離(km)。検索点の基準 */
  readonly placesOffsetKm: number;
  /** オフセット点周辺の Nearby Search 半径(m) */
  readonly placesRadiusMeters: number;
}

/** 既定モデル(最新モデル。環境変数で差し替え可能) */
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5";
const DEFAULT_OPENAI_MODEL = "gpt-5";
// 推論モデル(gpt-5 等)は推論トークンもこの枠を消費するため、
// 本文が出力できるよう余裕を持たせる(reasoning_effort=minimal と併用)。
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_DAILY_CRON = "0 3 * * *";
const DEFAULT_MONTHLY_CRON = "30 3 1 * *";
const DEFAULT_TIMEZONE = "Asia/Tokyo";
// 吉方位方向に数km オフセットした点の周辺を探す(方位の「向き」を活かしつつ生活圏内)。
const DEFAULT_PLACES_OFFSET_KM = 3;
const DEFAULT_PLACES_RADIUS_METERS = 1500;

let cached: BatchConfig | undefined;

function parseProvider(raw: string | undefined): LlmProviderKind {
  const v = (raw ?? "claude").trim().toLowerCase();
  if (v === "claude" || v === "openai" || v === "mock") {
    return v;
  }
  throw new Error(`LLM_PROVIDER must be one of claude|openai|mock (got "${raw ?? ""}")`);
}

/**
 * 環境変数を読み取り、検証して返す。2 回目以降はキャッシュを返す。
 * API キーの存在チェックはプロバイダ生成時(factory)に行う。
 */
export function getConfig(): BatchConfig {
  if (cached) return cached;

  const databasePath = process.env.DATABASE_PATH;
  if (!databasePath) {
    throw new Error("DATABASE_PATH is required");
  }

  const llmMaxTokensRaw = process.env.LLM_MAX_TOKENS;
  const llmMaxTokens = llmMaxTokensRaw ? Number(llmMaxTokensRaw) : DEFAULT_MAX_TOKENS;
  if (!Number.isInteger(llmMaxTokens) || llmMaxTokens < 1) {
    throw new Error("LLM_MAX_TOKENS must be a positive integer");
  }

  const offsetRaw = process.env.PLACES_OFFSET_KM;
  const placesOffsetKm = offsetRaw ? Number(offsetRaw) : DEFAULT_PLACES_OFFSET_KM;
  if (!Number.isFinite(placesOffsetKm) || placesOffsetKm <= 0) {
    throw new Error("PLACES_OFFSET_KM must be a positive number");
  }

  const radiusRaw = process.env.PLACES_RADIUS_METERS;
  const placesRadiusMeters = radiusRaw ? Number(radiusRaw) : DEFAULT_PLACES_RADIUS_METERS;
  if (!Number.isInteger(placesRadiusMeters) || placesRadiusMeters < 1) {
    throw new Error("PLACES_RADIUS_METERS must be a positive integer");
  }

  cached = {
    databasePath,
    llmProvider: parseProvider(process.env.LLM_PROVIDER),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    claudeModel: process.env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
    openaiModel: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    llmMaxTokens,
    dailyCron: process.env.DAILY_CRON?.trim() || DEFAULT_DAILY_CRON,
    monthlyCron: process.env.MONTHLY_CRON?.trim() || DEFAULT_MONTHLY_CRON,
    cronTimezone: process.env.CRON_TIMEZONE?.trim() || DEFAULT_TIMEZONE,
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
    placesOffsetKm,
    placesRadiusMeters,
  };

  return cached;
}

/** テスト用: キャッシュをクリアする */
export function resetConfigCache(): void {
  cached = undefined;
}
