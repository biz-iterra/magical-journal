/**
 * /api/personality — マイタイプの「AI占い」で表示する性質レポート(6項目)。
 *
 * GET  /                    保存済みの性質レポートを返す(未生成なら report: null)。
 * POST /regenerate          手動再生成(品質テスト用)。1ユーザー1日(JST)最大5回。
 *
 * レポートは登録時の非同期生成・手動再生成・保険の夜間バッチで生成する
 * (CLAUDE.md ルール6: リクエストトリガー生成 + 保険バッチ)。
 *
 * ★privacy/著作権ガード: レポートは確定情報(タイプ・星座)由来の性質説明のみ。
 * axes・氏名・住所などの内部/個人特定情報は含めない(生成側の @mj/batch で保証)。
 */

import { generatePersonalityForUser } from "@mj/batch";
import { Hono } from "hono";
import {
  getPersonalityReport,
  getProfile,
  getRegenCount,
  getUserByLineId,
  incrementRegenCount,
  savePersonalityReport,
} from "../db/queries.js";
import { fail } from "../errors.js";
import { buildGenerationProviders } from "../services/generation.js";
import type { AppEnv } from "../types.js";

/** 1ユーザー1日あたりの手動再生成の上限回数 */
const REGEN_DAILY_LIMIT = 5;

const personality = new Hono<AppEnv>();

/**
 * JST で今日の日付を "YYYY-MM-DD" 形式で返す(レート制限のキー)。
 */
function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

personality.get("/", (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const prof = getProfile(user.id);
  if (!prof) {
    return fail(c, "MJ-PROFILE-404");
  }

  const row = getPersonalityReport(user.id);
  if (!row) {
    // 未生成(登録直後の非同期生成が未完 or 生成失敗)。UI は「準備中」を表示する。
    // 保険の夜間バッチでも生成される。
    return c.json({ report: null });
  }

  let report: unknown = null;
  try {
    report = JSON.parse(row.report_json);
  } catch {
    // 壊れた JSON は未生成扱い(次回の生成で再作成される)
    return c.json({ report: null });
  }

  return c.json({ report });
});

/**
 * POST /api/personality/regenerate
 *
 * 性質レポートを手動で再生成する(品質テスト用)。本人セッション必須。
 * レート制限: 1ユーザー1日(JST)最大5回。試行時にカウントを消費する(LLM コスト保護)。
 * 上限到達時は生成せず MJ-PERS-429(429)を返す。
 */
personality.post("/regenerate", async (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const prof = getProfile(user.id);
  if (!prof) {
    return fail(c, "MJ-PROFILE-404");
  }

  // レート制限: 当日カウントが上限以上なら生成せず 429。
  const dateStr = todayJST();
  if (getRegenCount(user.id, dateStr) >= REGEN_DAILY_LIMIT) {
    return fail(c, "MJ-PERS-429");
  }
  // 試行時にインクリメント(生成失敗でもカウントは消費する = コスト保護)。原子的 upsert。
  incrementRegenCount(user.id, dateStr);

  try {
    const { provider } = buildGenerationProviders();
    const activeUser = {
      userId: user.id,
      birthDate: prof.birth_date,
      birthTime: prof.birth_time,
      charStyle: prof.char_style,
      lat: prof.lat,
      lng: prof.lng,
    };
    const report = await generatePersonalityForUser(activeUser, { provider });
    savePersonalityReport(user.id, JSON.stringify(report));
    return c.json({ report });
  } catch (err) {
    // 生成失敗は握りつぶさずログに残す(個人情報は出さない。user_id のみ)。
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[personality] user_id=${String(user.id)} 手動再生成に失敗: ${message}`);
    return fail(c, "MJ-SYS-001");
  }
});

export default personality;
