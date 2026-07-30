/**
 * 月運(今月の運勢文)の遅延生成。
 *
 * v0.6 で月間運勢ページを「今日のジャーナル」へ集約したため、月運は GET /api/today の
 * 応答に含める。未生成の場合は fire-and-forget でここを呼び出し、その回の応答は
 * text=null で返す(次回アクセスで表示される)。今日の運勢は同期生成しているので、
 * 月運まで同期にすると1リクエストで LLM を2回叩いて待たせることになる。月運は
 * 月1回しか変わらないため非同期で十分。保険の月次バッチでも生成される。
 *
 * 生成本体(1ユーザー分の純関数 generateMonthlyForUser)は @mj/batch に集約し、
 * ここは「プロバイダ構築 → 生成 → 保存 → 失敗ログ」の配線だけを行う
 * (ロジックの重複を作らない)。
 *
 * ★この関数は絶対に throw しない(呼び出し元のリクエストを失敗させない)。
 *   失敗は握りつぶさずログに残す。個人情報は出さない(user_id のみ)。
 */

import { type ActiveUser, type MonthlyCalendarProvider, generateMonthlyForUser } from "@mj/batch";
import { saveMonthlyFortune } from "../db/queries.js";
import { buildGenerationProviders } from "./generation.js";

/**
 * 1ユーザー分の月運を生成して monthly_fortunes に upsert する。
 *
 * 保存キーは generateMonthlyForUser が算出した気学年・気学月(節入り基準)。
 * 生成結果が空文字なら fortune_text は null で保存する(UI は「準備中」を出せる)。
 *
 * @param user 生成対象ユーザー(方位・運勢の算出に必要な最小項目のみ)
 * @param dateStr 対象日付 "YYYY-MM-DD"(JST)。ここから気学年・気学月を求める
 * @param calendar 気学年・気学月を求められる暦マスタプロバイダ
 */
export async function generateAndSaveMonthly(
  user: ActiveUser,
  dateStr: string,
  calendar: MonthlyCalendarProvider,
): Promise<void> {
  try {
    const { provider } = buildGenerationProviders();
    const { structured, fortuneText } = await generateMonthlyForUser(user, dateStr, {
      provider,
      calendar,
    });
    saveMonthlyFortune(
      user.userId,
      structured.kigakuYear,
      structured.kigakuMonth,
      JSON.stringify(structured),
      fortuneText || null,
    );
  } catch (err) {
    // 握りつぶさずログのみ(個人情報は出さない。user_id のみ)。応答には影響させない。
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[today] user_id=${String(user.userId)} 月運の生成に失敗: ${message}`);
  }
}
