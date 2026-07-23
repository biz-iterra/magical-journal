/**
 * 夜間バッチ本体(設計書§夜間バッチのフロー / 毎日 03:00 JST)。
 *
 *   1. アクティブユーザーを取得
 *   2. ユーザーごとに当日の構造化データを算出(engine + 暦マスタ = 決定的)
 *   3. 構造化データ + タイプ×char_style のトーンをプロンプトに注入し LLM で文章生成
 *   4. daily_fortunes に upsert(directions_json も保存)
 *
 * CLAUDE.md: 失敗ユーザーはスキップして続行し、失敗一覧をログに残す。
 * 個人情報(生年月日・氏名・住所)はログに出力しない(user_id のみ)。
 */

import type { CalendarProvider } from "@mj/engine";
import type { CharStyle } from "../data/personas.js";
import { getPersona } from "../data/personas.js";
import type { LlmProvider } from "../llm/provider.js";
import { buildDailyPrompt } from "./prompt.js";
import { buildDailyStructured } from "./structured.js";

/**
 * バッチ処理対象ユーザー(方位・運勢の算出に必要な最小項目のみ)。
 * db/queries.ts の ActiveUser と同一構造(run.ts を DB 非依存に保つため再宣言)。
 */
export interface ActiveUser {
  readonly userId: number;
  readonly birthDate: string;
  readonly birthTime: string | null;
  readonly charStyle: string;
}

/** 最小ロガー(差し替え可能) */
export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

const defaultLogger: Logger = {
  info: (m) => console.log(m),
  error: (m) => console.error(m),
};

export interface RunDailyDeps {
  readonly provider: LlmProvider;
  readonly calendar: CalendarProvider;
  /** ユーザー取得(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly getUsers: () => ActiveUser[];
  /** 保存(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly saveFortune: (
    userId: number,
    date: string,
    directionsJson: string | null,
    fortuneText: string | null,
  ) => void;
  readonly logger?: Logger;
}

export interface RunDailyFailure {
  readonly userId: number;
  readonly error: string;
}

export interface RunDailyResult {
  readonly date: string;
  readonly total: number;
  readonly succeeded: number;
  readonly failed: readonly RunDailyFailure[];
}

/** char_style 文字列を CharStyle に正規化(不正値は undefined) */
function toCharStyle(raw: string): CharStyle | undefined {
  return raw === "male" || raw === "female" ? raw : undefined;
}

/**
 * 指定日の日次運勢バッチを実行する(1 回実行)。
 * @param date 対象日付 "YYYY-MM-DD"(JST)
 */
export async function runDailyBatch(date: string, deps: RunDailyDeps): Promise<RunDailyResult> {
  const logger = deps.logger ?? defaultLogger;
  const { getUsers, saveFortune } = deps;

  const users = getUsers();
  logger.info(
    `[daily] date=${date} provider=${deps.provider.name} users=${String(users.length)} 開始`,
  );

  const failed: RunDailyFailure[] = [];
  let succeeded = 0;

  for (const user of users) {
    try {
      // 2. 構造化データ(決定的)
      const structured = buildDailyStructured(
        { birthDate: user.birthDate, birthTime: user.birthTime, date },
        deps.calendar,
      );

      // 3. トーン注入 + LLM 生成
      const style = toCharStyle(user.charStyle);
      const persona = style ? getPersona(structured.potentialType, style) : undefined;
      const prompt = buildDailyPrompt(structured, persona);
      const fortuneText = await deps.provider.generate(prompt);

      // 4. 保存(directions_json も)
      saveFortune(user.userId, date, JSON.stringify(structured), fortuneText);
      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ userId: user.userId, error: message });
      // 個人情報は出さない(user_id のみ)
      logger.error(`[daily] user_id=${String(user.userId)} 失敗: ${message}`);
    }
  }

  const result: RunDailyResult = {
    date,
    total: users.length,
    succeeded,
    failed,
  };
  logger.info(
    `[daily] date=${date} 完了 total=${String(result.total)} ok=${String(succeeded)} ng=${String(failed.length)}`,
  );
  return result;
}
