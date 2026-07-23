/**
 * DB クエリ関数群。
 * 各テーブルの CRUD 操作を提供する。
 */

import type {
  DailyFortuneRow,
  DiagResultRow,
  MonthlyFortuneRow,
  PersonalityReportRow,
  ProfileRow,
  UserRow,
} from "../types.js";
import { getDb } from "./connection.js";

// ── users ───────────────────────────────────────────────────

export function createUser(
  lineUserId: string,
  displayName: string | null,
  isAllowed: boolean,
): UserRow {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (line_user_id, display_name, is_allowed)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(lineUserId, displayName, isAllowed ? 1 : 0);
  const user = getUserById(Number(result.lastInsertRowid));
  if (!user) {
    throw new Error("Failed to create user: row not found after INSERT");
  }
  return user;
}

export function getUserByLineId(lineUserId: string): UserRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE line_user_id = ?");
  return stmt.get(lineUserId) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) as UserRow | undefined;
}

// ── profiles ────────────────────────────────────────────────

export interface CreateProfileData {
  readonly birthDate: string;
  readonly birthTime?: string;
  readonly nameKana: string;
  readonly nameRomaji: string;
  readonly addressText?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly charStyle: string;
}

export function createProfile(userId: number, data: CreateProfileData): ProfileRow {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO profiles (user_id, birth_date, birth_time, name_kana, name_romaji,
                          address_text, lat, lng, char_style)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    userId,
    data.birthDate,
    data.birthTime ?? null,
    data.nameKana,
    data.nameRomaji,
    data.addressText ?? null,
    data.lat ?? null,
    data.lng ?? null,
    data.charStyle,
  );
  const profile = getProfile(userId);
  if (!profile) {
    throw new Error("Failed to create profile: row not found after INSERT");
  }
  return profile;
}

export function getProfile(userId: number): ProfileRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM profiles WHERE user_id = ?");
  return stmt.get(userId) as ProfileRow | undefined;
}

export interface UpdateProfileData {
  readonly birthTime?: string;
  readonly addressText?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly charStyle?: string;
}

export function updateProfile(userId: number, data: UpdateProfileData): ProfileRow | undefined {
  const db = getDb();

  // 更新対象のカラムを動的に構築
  const sets: string[] = [];
  const values: unknown[] = [];

  if (data.birthTime !== undefined) {
    sets.push("birth_time = ?");
    values.push(data.birthTime);
  }
  if (data.addressText !== undefined) {
    sets.push("address_text = ?");
    values.push(data.addressText);
  }
  if (data.lat !== undefined) {
    sets.push("lat = ?");
    values.push(data.lat);
  }
  if (data.lng !== undefined) {
    sets.push("lng = ?");
    values.push(data.lng);
  }
  if (data.charStyle !== undefined) {
    sets.push("char_style = ?");
    values.push(data.charStyle);
  }

  if (sets.length === 0) {
    return getProfile(userId);
  }

  sets.push("updated_at = datetime('now')");
  values.push(userId);

  const sql = `UPDATE profiles SET ${sets.join(", ")} WHERE user_id = ?`;
  db.prepare(sql).run(...values);

  return getProfile(userId);
}

// ── diag_results ────────────────────────────────────────────

export function saveDiagResult(
  userId: number,
  moduleId: string,
  moduleVersion: number,
  resultJson: string,
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO diag_results (user_id, module_id, module_version, result_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, module_id) DO UPDATE SET
      module_version = excluded.module_version,
      result_json = excluded.result_json,
      computed_at = datetime('now')
  `);
  stmt.run(userId, moduleId, moduleVersion, resultJson);
}

export function getDiagResults(userId: number): DiagResultRow[] {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM diag_results WHERE user_id = ? ORDER BY module_id");
  return stmt.all(userId) as DiagResultRow[];
}

export function getDiagResult(userId: number, moduleId: string): DiagResultRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM diag_results WHERE user_id = ? AND module_id = ?");
  return stmt.get(userId, moduleId) as DiagResultRow | undefined;
}

// ── daily_fortunes ──────────────────────────────────────────

export function saveDailyFortune(
  userId: number,
  date: string,
  directionsJson: string | null,
  fortuneText: string | null,
  sectionsJson: string | null = null,
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_fortunes (user_id, date, directions_json, fortune_text, sections_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      directions_json = excluded.directions_json,
      fortune_text = excluded.fortune_text,
      sections_json = excluded.sections_json,
      created_at = datetime('now')
  `);
  stmt.run(userId, date, directionsJson, fortuneText, sectionsJson);
}

export function getDailyFortune(userId: number, date: string): DailyFortuneRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM daily_fortunes WHERE user_id = ? AND date = ?");
  return stmt.get(userId, date) as DailyFortuneRow | undefined;
}

// ── personality_reports ─────────────────────────────────────

/**
 * 性質レポート(「AI占い」用)を返す。未生成なら undefined。
 * 生成は登録時の非同期生成・手動再生成・保険の夜間バッチで行う(CLAUDE.md ルール6)。
 */
export function getPersonalityReport(userId: number): PersonalityReportRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM personality_reports WHERE user_id = ?");
  return stmt.get(userId) as PersonalityReportRow | undefined;
}

/**
 * 性質レポートを upsert する(UNIQUE(user_id))。
 * batch/db/queries.ts の savePersonalityReport と同一挙動。
 */
export function savePersonalityReport(userId: number, reportJson: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO personality_reports (user_id, report_json)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      report_json = excluded.report_json,
      created_at = datetime('now')
  `);
  stmt.run(userId, reportJson);
}

// ── personality_regen_counts(手動再生成のレート制限) ───────────

/**
 * 当日(JST の "YYYY-MM-DD")の手動再生成カウントを返す。行が無ければ 0。
 */
export function getRegenCount(userId: number, date: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT count FROM personality_regen_counts WHERE user_id = ? AND date = ?")
    .get(userId, date) as { count: number } | undefined;
  return row ? row.count : 0;
}

/**
 * 当日の手動再生成カウントを 1 増やし、増加後の値を返す(原子的 upsert)。
 * ★試行時にインクリメントする(LLM コスト保護。生成失敗でもカウントは消費する)。
 */
export function incrementRegenCount(userId: number, date: string): number {
  const db = getDb();
  const row = db
    .prepare(`
      INSERT INTO personality_regen_counts (user_id, date, count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1
      RETURNING count
    `)
    .get(userId, date) as { count: number };
  return row.count;
}

// ── monthly_fortunes ────────────────────────────────────────

/**
 * 指定した気学年・気学月の月次運勢を返す(節入り基準のキー)。
 */
export function getMonthlyFortune(
  userId: number,
  kigakuYear: number,
  kigakuMonth: number,
): MonthlyFortuneRow | undefined {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM monthly_fortunes WHERE user_id = ? AND kigaku_year = ? AND kigaku_month = ?",
  );
  return stmt.get(userId, kigakuYear, kigakuMonth) as MonthlyFortuneRow | undefined;
}
