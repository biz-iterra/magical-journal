/**
 * @mj/batch のライブラリ用バレル(API 公開面)。
 *
 * API(@mj/api)が「リクエストトリガーの文章生成」で使うものだけを re-export する。
 * 生成本体(1ユーザー分の純関数)・プロバイダファクトリ・config を共有し、
 * ロジックの重複を作らない。
 *
 * ★index.ts(CLI エントリ。main() を実行する副作用あり)は絶対に import/re-export しない。
 *   ここが import する各モジュールも index.ts / db/connection.js に依存していないこと。
 */

// ── 生成本体(1ユーザー分。DB 保存は呼び出し側の責務) ──────────────
export { generateDailyForUser } from "./daily/run.js";
export type { ActiveUser, GenerateDailyDeps, Logger } from "./daily/run.js";
export type { DailyStructured } from "./daily/structured.js";
export type { DailySections } from "./daily/sections.js";

// ── 「今日のジャーナル」設定(お気に入り地点・活動時間帯・移動手段・休日曜日) ──
// API 側の入力検証・DB 読み出しでも同じ定義を使い、二重定義を作らない。
export type {
  FavoritePlace,
  PlacesDistance,
  ResolvedSchedulePreferences,
  TransportMode,
  UserJournalSettings,
  UserPreferences,
} from "./daily/preferences.js";
export {
  DEFAULT_HOLIDAY_WEEKDAYS,
  EMPTY_JOURNAL_SETTINGS,
  FAVORITE_PLACES_LIMIT,
  TRANSPORT_DISTANCE,
  TRANSPORT_MODES,
  isHoliday,
  isHolidayWeekdays,
  isTimeOfDay,
  isTransportMode,
  resolvePlacesDistance,
  transportLabel,
  weekdayOf,
} from "./daily/preferences.js";
export { generatePersonalityForUser } from "./personality/run.js";
export type { GeneratePersonalityDeps } from "./personality/run.js";
export type { PersonalityReport, PersonalityItems } from "./personality/report.js";
export { generateMonthlyForUser } from "./monthly/run.js";
export type { GenerateMonthlyDeps } from "./monthly/run.js";
export type { MonthlyStructured, MonthlyCalendarProvider } from "./monthly/structured.js";

// ── プロバイダファクトリ・設定(遅延構築用) ────────────────────────
export { createLlmProvider } from "./llm/factory.js";
export { createPlacesProvider } from "./places/factory.js";
export type { LlmProvider, LlmPrompt } from "./llm/provider.js";
export type { PlacesProvider } from "./places/provider.js";
export { getConfig } from "./config.js";
export type { BatchConfig, LlmProviderKind } from "./config.js";
