/**
 * DB クエリ関数群。
 * 各テーブルの CRUD 操作を提供する。
 */

import type { DailyFortuneRow, DiagResultRow, ProfileRow, UserRow } from "../types.js";
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
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO daily_fortunes (user_id, date, directions_json, fortune_text)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      directions_json = excluded.directions_json,
      fortune_text = excluded.fortune_text,
      created_at = datetime('now')
  `);
  stmt.run(userId, date, directionsJson, fortuneText);
}

export function getDailyFortune(userId: number, date: string): DailyFortuneRow | undefined {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM daily_fortunes WHERE user_id = ? AND date = ?");
  return stmt.get(userId, date) as DailyFortuneRow | undefined;
}
