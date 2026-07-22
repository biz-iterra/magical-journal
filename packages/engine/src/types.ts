// ── 入力・モジュール共通 ──────────────────────────────────

export type InputKey =
  | "birth_date"
  | "birth_time"
  | "name_kana"
  | "name_romaji"
  | "name_kanji"
  | "home_latlng";

export type ModuleStatus = "enabled" | "held" | "planned";

export interface ProfileInputs {
  readonly birthDate: string;
  readonly birthTime?: string;
  readonly nameKana?: string;
  readonly nameRomaji?: string;
  readonly nameKanji?: string;
  readonly homeLat?: number;
  readonly homeLng?: number;
}

export interface DiagnosisModule {
  readonly id: string;
  readonly version: number;
  readonly requiredInputs: readonly InputKey[];
  readonly optionalInputs: readonly InputKey[];
  readonly clientSafe: boolean;
  compute(inputs: ProfileInputs, masters?: unknown): unknown;
}

// ── 九星関連 ─────────────────────────────────────────────

/** 九星の番号(1=一白水星 〜 9=九紫火星) */
export type StarNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 五行 */
export type GogyoElement = "wood" | "fire" | "earth" | "metal" | "water";

/** 八方位 */
export type Direction8 = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

/** 盤(年盤・月盤・日盤) */
export interface Ban {
  readonly center: StarNumber;
  readonly positions: Readonly<Record<Direction8, StarNumber>>;
}

/** 方位の吉凶 */
export type DirectionFortune = "great_fortune" | "fortune" | "neutral" | "misfortune";

/** 凶方位の種類 */
export type MisfortuneType =
  | "goou_satsu" // 五黄殺
  | "anken_satsu" // 暗剣殺
  | "saiha" // 歳破
  | "geppa" // 月破
  | "nippa" // 日破
  | "jouiTaichu" // 定位対冲
  | "honmei_satsu" // 本命殺
  | "honmei_tekisatsu" // 本命的殺
  | "getsumei_satsu" // 月命殺
  | "getsumei_tekisatsu"; // 月命的殺

/** 方位判定結果 */
export interface DirectionResult {
  readonly direction: Direction8;
  readonly star: StarNumber;
  readonly fortune: DirectionFortune;
  readonly misfortunes: readonly MisfortuneType[];
}

// ── ポテンシャルタイプ関連 ───────────────────────────────

/** 12タイプID */
export type PotentialTypeId =
  | "IR+"
  | "IR-"
  | "IL+"
  | "IL-"
  | "ER+"
  | "ER-"
  | "EL+"
  | "EL-"
  | "PR+"
  | "PR-"
  | "PL+"
  | "PL-";

/** ポテンシャル算出結果 */
export interface PotentialResult {
  readonly primaryType: PotentialTypeId;
  readonly secondaryType?: PotentialTypeId; // ハイブリッドの場合のみ
  readonly rawValue: number; // 算出値(0〜59)
}

// ── 星座関連 ─────────────────────────────────────────────

export type ZodiacSign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

// ── 数秘術関連 ───────────────────────────────────────────

/** ライフパス・ディスティニーの結果型 */
export type NumerologyNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

// ── CalendarProvider(DI 境界) ───────────────────────────

export interface SekkiriBoundary {
  readonly month: number; // 気学上の月(1〜12)
  readonly date: string; // 節入り日 "YYYY-MM-DD"
}

export interface CalendarProvider {
  getSekkiriBoundaries(year: number): readonly SekkiriBoundary[];
  getYearBan(year: number): Ban;
  getMonthBan(year: number, month: number): Ban;
  getDayBan(date: string): Ban;
  getYearJunishi(year: number): number; // 十二支番号(0〜11)
  getMonthJunishi(year: number, month: number): number;
  getDayJunishi(date: string): number;
}
