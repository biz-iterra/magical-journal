/**
 * 診断実行サービス。
 *
 * enabled モジュールをレジストリ経由で全実行し、diag_results に upsert する。
 * 登録時(register)と設定変更時(profile PATCH)の両方から利用する共通処理。
 */

import { MasterCalendarProvider } from "@mj/calendar-data";
import type { ProfileInputs } from "@mj/engine";
import { saveDiagResult } from "../db/queries.js";
import { createRegistry } from "../registry-setup.js";

/**
 * enabled モジュールを全実行し、結果を diag_results に保存する。
 * saveDiagResult は upsert のため、再実行で既存結果を更新する(冪等)。
 */
export function runAndSaveDiagnosis(userId: number, inputs: ProfileInputs): void {
  const registry = createRegistry();
  const calendar = new MasterCalendarProvider();

  const results = registry.computeAll(inputs, calendar);

  for (const [moduleId, result] of results) {
    const moduleReg = registry.getModule(moduleId);
    if (moduleReg) {
      saveDiagResult(userId, moduleId, moduleReg.module.version, JSON.stringify(result));
    }
  }
}
