/**
 * バッチ用 DB クエリ。
 * api の packages/api/src/db/queries.ts と同じテーブルを対象にする。
 * 個人情報(氏名・住所)はバッチの処理に不要なため取得しない(最小取得)。
 */

import type { ActiveUser } from "../daily/run.js";
import { getDb } from "./connection.js";

/**
 * アクティブユーザー(許可済み かつ プロフィール登録済み)を返す。
 * 氏名・住所は取得しない。
 */
export function getActiveUsers(): ActiveUser[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.user_id     AS userId,
              p.birth_date  AS birthDate,
              p.birth_time  AS birthTime,
              p.char_style  AS charStyle
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE u.is_allowed = 1
        ORDER BY p.user_id`,
    )
    .all() as ActiveUser[];
  return rows;
}

/**
 * daily_fortunes に upsert する(UNIQUE(user_id, date))。
 * api 側の saveDailyFortune と同一挙動。
 */
export function saveDailyFortune(
  userId: number,
  date: string,
  directionsJson: string | null,
  fortuneText: string | null,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO daily_fortunes (user_id, date, directions_json, fortune_text)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       directions_json = excluded.directions_json,
       fortune_text = excluded.fortune_text,
       created_at = datetime('now')`,
  ).run(userId, date, directionsJson, fortuneText);
}

/**
 * monthly_fortunes に upsert する(UNIQUE(user_id, kigaku_year, kigaku_month))。
 * キーは節入り基準の気学年・気学月。
 */
export function saveMonthlyFortune(
  userId: number,
  kigakuYear: number,
  kigakuMonth: number,
  directionsJson: string | null,
  fortuneText: string | null,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO monthly_fortunes (user_id, kigaku_year, kigaku_month, directions_json, fortune_text)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, kigaku_year, kigaku_month) DO UPDATE SET
       directions_json = excluded.directions_json,
       fortune_text = excluded.fortune_text,
       created_at = datetime('now')`,
  ).run(userId, kigakuYear, kigakuMonth, directionsJson, fortuneText);
}

/**
 * 当該気学月の月次運勢が既に存在するかを返す(冪等性チェック用)。
 */
export function hasMonthlyFortune(
  userId: number,
  kigakuYear: number,
  kigakuMonth: number,
): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT 1 FROM monthly_fortunes
        WHERE user_id = ? AND kigaku_year = ? AND kigaku_month = ?
        LIMIT 1`,
    )
    .get(userId, kigakuYear, kigakuMonth);
  return row !== undefined;
}
