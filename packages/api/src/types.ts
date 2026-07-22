/**
 * API 共通型定義。
 */

// ── Hono 環境型 ─────────────────────────────────────────────

/** Hono アプリのコンテキスト変数 */
export type AppEnv = {
  Variables: {
    /** 認証済みの LINE ユーザー ID */
    lineUserId: string;
  };
};

// ── DB 行型 ─────────────────────────────────────────────────

export interface UserRow {
  readonly id: number;
  readonly line_user_id: string;
  readonly display_name: string | null;
  readonly is_allowed: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ProfileRow {
  readonly user_id: number;
  readonly birth_date: string;
  readonly birth_time: string | null;
  readonly name_kana: string;
  readonly name_romaji: string;
  readonly address_text: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly char_style: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface DiagResultRow {
  readonly id: number;
  readonly user_id: number;
  readonly module_id: string;
  readonly module_version: number;
  readonly result_json: string;
  readonly computed_at: string;
}

export interface DailyFortuneRow {
  readonly id: number;
  readonly user_id: number;
  readonly date: string;
  readonly directions_json: string | null;
  readonly fortune_text: string | null;
  readonly created_at: string;
}

// ── API リクエスト型 ────────────────────────────────────────

export interface RegisterBody {
  readonly birthDate: string;
  readonly birthTime?: string;
  readonly nameKana: string;
  readonly nameRomaji: string;
  readonly addressText?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly charStyle: "male" | "female";
}

export interface ProfileUpdateBody {
  readonly addressText?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly charStyle?: "male" | "female";
}
