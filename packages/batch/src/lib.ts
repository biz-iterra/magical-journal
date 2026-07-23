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
export { generatePersonalityForUser } from "./personality/run.js";
export type { GeneratePersonalityDeps } from "./personality/run.js";
export type { PersonalityReport, PersonalityItems } from "./personality/report.js";

// ── プロバイダファクトリ・設定(遅延構築用) ────────────────────────
export { createLlmProvider } from "./llm/factory.js";
export { createPlacesProvider } from "./places/factory.js";
export type { LlmProvider, LlmPrompt } from "./llm/provider.js";
export type { PlacesProvider } from "./places/provider.js";
export { getConfig } from "./config.js";
export type { BatchConfig, LlmProviderKind } from "./config.js";
