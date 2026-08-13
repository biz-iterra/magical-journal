/**
 * 日付文字列の検証と分解。
 *
 * ★engine は Date を生成しない(タイムゾーン事故防止。暦は JST 前提)。
 *   ここも整数演算だけで実在判定する。
 *
 * ★書式だけを正規表現で見て通すと、"2000-02-31" のような実在しない日付が
 *   ユリウス日演算で黙って 2000-03-02 に正規化され、誤った診断結果が保存される。
 *   診断は決定的でなければならない(CLAUDE.md ルール2)ので、入口で落とす。
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIME = /^(\d{2}):(\d{2})$/;

/** 各月の日数(平年)。index 1〜12 */
const DAYS_IN_MONTH: readonly number[] = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** グレゴリオ暦のうるう年判定 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 指定年月の日数を返す */
export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month] ?? 0;
}

/**
 * "YYYY-MM-DD" を [year, month, day] に分解する。
 * 書式不正・実在しない日付は例外にする。
 */
export function parseIsoDate(dateStr: string): [number, number, number] {
  const match = ISO_DATE.exec(dateStr);
  if (!match) {
    throw new Error(`date must be "YYYY-MM-DD" (got "${dateStr}")`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) {
    throw new Error(`date has an invalid month: "${dateStr}"`);
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`date does not exist in the calendar: "${dateStr}"`);
  }
  return [year, month, day];
}

/** 実在する "YYYY-MM-DD" かどうか(例外を投げずに判定したい呼び出し側向け) */
export function isValidIsoDate(dateStr: string): boolean {
  try {
    parseIsoDate(dateStr);
    return true;
  } catch {
    return false;
  }
}

/** "HH:MM" として実在する時刻かどうか */
export function isValidTimeOfDay(time: string): boolean {
  const match = ISO_TIME.exec(time);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
