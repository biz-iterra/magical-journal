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

export interface UserPreferencesRow {
  readonly user_id: number;
  /** 起床時刻 "HH:MM"。null=未設定 */
  readonly wake_time: string | null;
  /** 就寝時刻 "HH:MM"。null=未設定 */
  readonly sleep_time: string | null;
  /** 'walk'|'bike'|'train'|'car'。null=未設定 */
  readonly transport_mode: string | null;
  /** 休日にする曜日の JSON 配列 "[0,6]"(0=日 … 6=土)。null=未設定(既定の土日) */
  readonly holiday_weekdays: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FavoritePlaceRow {
  readonly id: number;
  readonly user_id: number;
  readonly name: string;
  readonly category: string | null;
  readonly address_text: string;
  readonly lat: number;
  readonly lng: number;
  readonly created_at: string;
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
  /** 3セクション {fortune, schedule, characterNote} の JSON。旧行では null */
  readonly sections_json: string | null;
  readonly created_at: string;
}

export interface PersonalityReportRow {
  readonly user_id: number;
  /** 6項目 + 生成根拠(potentialType/zodiac)を含む JSON */
  readonly report_json: string;
  readonly created_at: string;
}

export interface MonthlyFortuneRow {
  readonly id: number;
  readonly user_id: number;
  readonly kigaku_year: number;
  readonly kigaku_month: number;
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
  readonly birthTime?: string;
  readonly addressText?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly charStyle?: "male" | "female";
}

/**
 * PATCH /api/preferences のボディ(すべて任意)。
 * 値に null を渡すとその項目を未設定へ戻す。キー自体が無ければ変更しない。
 */
export interface PreferencesUpdateBody {
  readonly wakeTime?: string | null;
  readonly sleepTime?: string | null;
  readonly transportMode?: string | null;
  readonly holidayWeekdays?: number[] | null;
}

/** POST /api/preferences/places のボディ(お気に入り地点の追加) */
export interface FavoritePlaceCreateBody {
  readonly name: string;
  readonly addressText: string;
  readonly lat: number;
  readonly lng: number;
  readonly category?: string | null;
}
