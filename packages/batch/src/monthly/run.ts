/**
 * 月次バッチ本体(設計書§月間ページ / 月次バッチのフロー)。
 *
 *   1. 実行日(JST)から現在の気学年・気学月(節入り基準)を求める
 *   2. アクティブユーザーを取得
 *   3. ユーザーごとに:
 *      - 既に当該気学月の行があればスキップ(冪等性。日1回動かしても LLM を無駄に呼ばない)
 *      - 無ければ今月の構造化データを算出(engine + 暦マスタ = 決定的)
 *      - 構造化データ + タイプ×char_style のトーンをプロンプトに注入し LLM で文章生成
 *      - monthly_fortunes に upsert(directions_json も保存)
 *
 * 気学月をキーにすることで、月次 cron を月1回で回しても、日次で回しても、
 * 節入り遷移をまたいだ最初の実行で自動的に新しい気学月ぶんを生成できる。
 *
 * CLAUDE.md: 失敗ユーザーはスキップして続行し、失敗一覧をログに残す。
 * 個人情報(生年月日・氏名・住所)はログに出力しない(user_id のみ)。
 */

import type { CharStyle } from "../data/personas.js";
import { getPersona } from "../data/personas.js";
import type { LlmProvider } from "../llm/provider.js";
import { buildMonthlyPrompt } from "./prompt.js";
import { buildMonthlyStructured } from "./structured.js";
import type { MonthlyCalendarProvider } from "./structured.js";

/**
 * バッチ処理対象ユーザー(方位・運勢の算出に必要な最小項目のみ)。
 * daily/run.ts の ActiveUser と同一構造。
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

export interface RunMonthlyDeps {
  readonly provider: LlmProvider;
  readonly calendar: MonthlyCalendarProvider;
  /** ユーザー取得(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly getUsers: () => ActiveUser[];
  /** 当該気学月の行が既に存在するか(冪等性チェック。index.ts が DB 実装を注入) */
  readonly hasFortune: (userId: number, kigakuYear: number, kigakuMonth: number) => boolean;
  /** 保存(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly saveFortune: (
    userId: number,
    kigakuYear: number,
    kigakuMonth: number,
    directionsJson: string | null,
    fortuneText: string | null,
  ) => void;
  /** true なら既存行があっても再生成する(既定 false) */
  readonly force?: boolean;
  readonly logger?: Logger;
}

export interface RunMonthlyFailure {
  readonly userId: number;
  readonly error: string;
}

export interface RunMonthlyResult {
  readonly date: string;
  readonly kigakuYear: number;
  readonly kigakuMonth: number;
  readonly total: number;
  readonly succeeded: number;
  /** 既に生成済みでスキップした件数 */
  readonly skipped: number;
  readonly failed: readonly RunMonthlyFailure[];
}

/** char_style 文字列を CharStyle に正規化(不正値は undefined) */
function toCharStyle(raw: string): CharStyle | undefined {
  return raw === "male" || raw === "female" ? raw : undefined;
}

/**
 * 指定日を含む気学月の月次運勢バッチを実行する(1 回実行)。
 * @param date 対象日付 "YYYY-MM-DD"(JST)。ここから気学年・気学月を求める
 */
export async function runMonthlyBatch(
  date: string,
  deps: RunMonthlyDeps,
): Promise<RunMonthlyResult> {
  const logger = deps.logger ?? defaultLogger;
  const { getUsers, hasFortune, saveFortune, calendar } = deps;
  const force = deps.force ?? false;

  // 実行日から現在の気学年・気学月(節入り基準)を確定(全ユーザー共通)
  const kigakuYear = calendar.getKigakuYear(date);
  const kigakuMonth = calendar.getKigakuMonth(date);

  const users = getUsers();
  logger.info(
    `[monthly] date=${date} kigaku=${String(kigakuYear)}/${String(kigakuMonth)} provider=${deps.provider.name} users=${String(users.length)}${force ? " force" : ""} 開始`,
  );

  const failed: RunMonthlyFailure[] = [];
  let succeeded = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      // 冪等性: 既に当該気学月の行があればスキップ(LLM を無駄に呼ばない)
      if (!force && hasFortune(user.userId, kigakuYear, kigakuMonth)) {
        skipped += 1;
        continue;
      }

      // 構造化データ(決定的)
      const structured = buildMonthlyStructured(
        { birthDate: user.birthDate, birthTime: user.birthTime, date },
        calendar,
      );

      // トーン注入 + LLM 生成
      const style = toCharStyle(user.charStyle);
      const persona = style ? getPersona(structured.potentialType, style) : undefined;
      const prompt = buildMonthlyPrompt(structured, persona);
      const fortuneText = await deps.provider.generate(prompt);

      // 保存(directions_json も)
      saveFortune(
        user.userId,
        structured.kigakuYear,
        structured.kigakuMonth,
        JSON.stringify(structured),
        fortuneText,
      );
      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ userId: user.userId, error: message });
      // 個人情報は出さない(user_id のみ)
      logger.error(`[monthly] user_id=${String(user.userId)} 失敗: ${message}`);
    }
  }

  const result: RunMonthlyResult = {
    date,
    kigakuYear,
    kigakuMonth,
    total: users.length,
    succeeded,
    skipped,
    failed,
  };
  logger.info(
    `[monthly] date=${date} kigaku=${String(kigakuYear)}/${String(kigakuMonth)} 完了 total=${String(result.total)} ok=${String(succeeded)} skip=${String(skipped)} ng=${String(failed.length)}`,
  );
  return result;
}
