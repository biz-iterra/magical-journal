/**
 * 十二支(じゅうにし)計算
 *
 * 子=0, 丑=1, 寅=2, 卯=3, 辰=4, 巳=5,
 * 午=6, 未=7, 申=8, 酉=9, 戌=10, 亥=11
 */

// ── ユリウス日計算(engine/potential.ts と同方式) ──────────

function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function parseDate(dateStr: string): [number, number, number] {
  const parts = dateStr.split("-");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

// ── 基準日(子の日) ────────────────────────────────────────
// yakumoin.info で 2026-06-19 = 甲子(十二支=子=0)を確認。
// 旧基準 1924-02-05 は実際には甲寅(十二支=寅=2)で2日ずれていた。
const NE_BASE_JD = toJulianDay(2026, 6, 19);

// ── 年の十二支 ────────────────────────────────────────────

/**
 * 気学上の年から十二支を返す。
 *
 * @param kigakuYear 気学上の年(立春区切り)
 * @returns 十二支番号(0=子〜11=亥)
 *
 * 基準: 2024年 = 辰年(4)
 */
export function getYearJunishi(kigakuYear: number): number {
  return (((kigakuYear - 2024 + 4) % 12) + 12) % 12;
}

// ── 月の十二支 ────────────────────────────────────────────

/**
 * 気学上の月から十二支を返す。
 *
 * @param kigakuMonth 気学上の月(1〜12)
 * @returns 十二支番号(0=子〜11=亥)
 *
 * 対応: 月1(丑)=1, 月2(寅)=2, ..., 月12(子)=0
 */
export function getMonthJunishi(kigakuMonth: number): number {
  return kigakuMonth % 12;
}

// ── 日の十二支 ────────────────────────────────────────────

/**
 * 日付から十二支を返す。
 *
 * @param date "YYYY-MM-DD" 形式の日付
 * @returns 十二支番号(0=子〜11=亥)
 *
 * 基準: 2026-06-19 = 甲子(子=0)、yakumoin.info 確認済み
 * 十二支は 12 日周期で循環する。
 */
export function getDayJunishi(date: string): number {
  const [year, month, day] = parseDate(date);
  const jd = toJulianDay(year, month, day);
  const diff = jd - NE_BASE_JD;
  return ((diff % 12) + 12) % 12;
}
