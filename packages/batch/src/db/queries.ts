/**
 * バッチ用 DB クエリ。
 * api の packages/api/src/db/queries.ts と同じテーブルを対象にする。
 * 個人情報(氏名・住所)はバッチの処理に不要なため取得しない(最小取得)。
 */

import type { FavoritePlace, UserJournalSettings, UserPreferences } from "../daily/preferences.js";
import { isHolidayWeekdays, isTransportMode } from "../daily/preferences.js";
import type { ActiveUser } from "../daily/run.js";
import { getDb } from "./connection.js";

/**
 * アクティブユーザー(許可済み かつ プロフィール登録済み)を返す。
 * 氏名・住所は取得しない。lat/lng は Places(スケジュールのスポット取得)に使う。
 */
export function getActiveUsers(): ActiveUser[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.user_id     AS userId,
              p.birth_date  AS birthDate,
              p.birth_time  AS birthTime,
              p.char_style  AS charStyle,
              p.lat         AS lat,
              p.lng         AS lng
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE u.is_allowed = 1
        ORDER BY p.user_id`,
    )
    .all() as ActiveUser[];
  return rows;
}

/** user_preferences の行(未設定なら行なし) */
interface UserPreferencesRow {
  readonly wakeTime: string | null;
  readonly sleepTime: string | null;
  readonly transportMode: string | null;
  readonly holidayWeekdays: string | null;
}

/**
 * holiday_weekdays(JSON 文字列)を安全にパースする。
 * 壊れた値・不正な値は null(= 既定の土日)として扱い、生成を止めない。
 */
function parseHolidayWeekdays(raw: string | null): readonly number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isHolidayWeekdays(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * ユーザーの「今日のジャーナル」設定(user_preferences + favorite_places)を返す。
 * 行が無ければ preferences=null / favoritePlaces=[](= 従来の既定挙動)。
 * ★住所文字列は取得しない(生成には名前・座標・カテゴリのみ必要。最小取得)。
 */
export function getUserJournalSettings(userId: number): UserJournalSettings {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT wake_time        AS wakeTime,
              sleep_time       AS sleepTime,
              transport_mode   AS transportMode,
              holiday_weekdays AS holidayWeekdays
         FROM user_preferences
        WHERE user_id = ?`,
    )
    .get(userId) as UserPreferencesRow | undefined;

  const preferences: UserPreferences | null = row
    ? {
        wakeTime: row.wakeTime,
        sleepTime: row.sleepTime,
        transportMode: isTransportMode(row.transportMode) ? row.transportMode : null,
        holidayWeekdays: parseHolidayWeekdays(row.holidayWeekdays),
      }
    : null;

  const favoritePlaces = db
    .prepare(
      `SELECT id, name, category, lat, lng
         FROM favorite_places
        WHERE user_id = ?
        ORDER BY id`,
    )
    .all(userId) as FavoritePlace[];

  return { preferences, favoritePlaces };
}

/**
 * daily_fortunes に upsert する(UNIQUE(user_id, date))。
 * api 側の saveDailyFortune と同一挙動。sections_json に3セクションを保存する。
 */
export function saveDailyFortune(
  userId: number,
  date: string,
  directionsJson: string | null,
  fortuneText: string | null,
  sectionsJson: string | null = null,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO daily_fortunes (user_id, date, directions_json, fortune_text, sections_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       directions_json = excluded.directions_json,
       fortune_text = excluded.fortune_text,
       sections_json = excluded.sections_json,
       created_at = datetime('now')`,
  ).run(userId, date, directionsJson, fortuneText, sectionsJson);
}

/**
 * personality_reports の report_json を返す(冪等性の署名比較用)。無ければ null。
 */
export function getPersonalityReportJson(userId: number): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT report_json AS reportJson FROM personality_reports WHERE user_id = ?")
    .get(userId) as { reportJson: string } | undefined;
  return row ? row.reportJson : null;
}

/**
 * personality_reports に upsert する(UNIQUE(user_id))。
 */
export function savePersonalityReport(userId: number, reportJson: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO personality_reports (user_id, report_json)
     VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       report_json = excluded.report_json,
       created_at = datetime('now')`,
  ).run(userId, reportJson);
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
 * その日の日次運勢が既に生成済みかを返す(冪等性チェック用)。
 *
 * リクエストトリガー生成(GET /api/today)で当日分がある場合に、夜間バッチが
 * 同じ内容を作り直して LLM 代を二重に払わないようにする。
 * 「行はあるが本文が無い」状態(生成失敗時)は未生成として扱い、バッチで救う。
 */
export function hasDailyFortune(userId: number, date: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT 1 FROM daily_fortunes
        WHERE user_id = ? AND date = ? AND sections_json IS NOT NULL
        LIMIT 1`,
    )
    .get(userId, date);
  return row !== undefined;
}

/**
 * 当該気学月の月次運勢が既に生成済みかを返す(冪等性チェック用)。
 *
 * ★行の有無ではなく本文の有無で判定する。生成に失敗して fortune_text=null の行が
 *   残っている場合、行だけを見てスキップすると保険バッチが永久に修復しない。
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
          AND fortune_text IS NOT NULL
        LIMIT 1`,
    )
    .get(userId, kigakuYear, kigakuMonth);
  return row !== undefined;
}
