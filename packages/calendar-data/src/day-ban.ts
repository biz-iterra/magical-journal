/**
 * 日盤の中宮星計算(陽遁・陰遁サイクル)
 *
 * 陽遁: 冬至に最も近い甲子の日から開始、中宮=一白(1)、毎日+1
 * 陰遁: 夏至に最も近い甲子の日から開始、中宮=九紫(9)、毎日-1
 *
 * 甲子(こうし): 六十干支の第1番。60日周期で循環する。
 * 基準日: 1924-02-05 = 甲子(junishi.ts と共通)
 *
 * yakumoin.info 準拠で検証済み。
 */

import type { StarNumber } from "@mj/engine";

// ── ユリウス日計算(junishi.ts と同方式) ─────────────────────

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

function jdToDateString(jd: number): string {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── 甲子(こうし)サイクル ──────────────────────────────────────

// yakumoin.info で 2026-06-19 が甲子であることを確認済み。
// junishi.ts の基準日(1924-02-05)は十二支の12日周期用であり、
// 六十干支の60日周期とはオフセットが異なるため、ここでは
// 検証済みの甲子日を直接基準とする。
const KOUSHI_BASE_JD = toJulianDay(2026, 6, 19);

/**
 * 指定ユリウス日に最も近い甲子の日のユリウス日を返す。
 * 等距離(30日)の場合は前の甲子を優先する。
 */
function nearestKoushiJd(targetJd: number): number {
  const diff = targetJd - KOUSHI_BASE_JD;
  const cyclePos = ((diff % 60) + 60) % 60;

  const prevKoushi = targetJd - cyclePos;
  const nextKoushi = prevKoushi + 60;

  if (nextKoushi - targetJd < targetJd - prevKoushi) {
    return nextKoushi;
  }
  return prevKoushi;
}

// ── 至(solstice)の概算 ──────────────────────────────────────

function approxWinterSolsticeJd(year: number): number {
  return toJulianDay(year, 12, 22);
}

function approxSummerSolsticeJd(year: number): number {
  return toJulianDay(year, 6, 21);
}

// ── 陽遁・陰遁の切替日 ──────────────────────────────────────

export interface YoutonIntonTransition {
  readonly youtonStart: string;
  readonly intonStart: string;
}

/**
 * 指定カレンダー年の陽遁・陰遁切替日を計算する。
 *
 * - 陽遁始め: 前年冬至に最も近い甲子の日(中宮=一白)
 * - 陰遁始め: 当年夏至に最も近い甲子の日(中宮=九紫)
 *
 * @param year グレゴリオ暦の年
 */
export function getTransitionDates(year: number): YoutonIntonTransition {
  const youtonJd = nearestKoushiJd(approxWinterSolsticeJd(year - 1));
  const intonJd = nearestKoushiJd(approxSummerSolsticeJd(year));

  return {
    youtonStart: jdToDateString(youtonJd),
    intonStart: jdToDateString(intonJd),
  };
}

// ── 日盤の中宮星 ────────────────────────────────────────────

/**
 * 日付から日盤の中宮星を計算する。
 *
 * @param date "YYYY-MM-DD" 形式
 * @returns 中宮星番号(1=一白 〜 9=九紫)
 */
export function getDayCenterStar(date: string): StarNumber {
  const [year, month, day] = parseDate(date);
  const dateJd = toJulianDay(year, month, day);

  // 前年・当年・翌年の全切替ポイントを収集
  const transitions: Array<{ jd: number; isYouton: boolean }> = [];

  for (const y of [year - 1, year, year + 1]) {
    transitions.push({
      jd: nearestKoushiJd(approxWinterSolsticeJd(y)),
      isYouton: true,
    });
    transitions.push({
      jd: nearestKoushiJd(approxSummerSolsticeJd(y)),
      isYouton: false,
    });
  }

  transitions.sort((a, b) => a.jd - b.jd);

  // dateJd 以前の最新切替を見つける
  let active: { jd: number; isYouton: boolean } | undefined;
  for (const t of transitions) {
    if (t.jd <= dateJd) {
      active = t;
    } else {
      break;
    }
  }

  if (active === undefined) {
    throw new Error(`Cannot determine youton/inton for ${date}`);
  }

  const daysSinceStart = dateJd - active.jd;

  if (active.isYouton) {
    // 陽遁: day 0 → 一白(1), day 1 → 二黒(2), ..., day 8 → 九紫(9), day 9 → 一白(1)
    return ((daysSinceStart % 9) + 1) as StarNumber;
  }
  // 陰遁: day 0 → 九紫(9), day 1 → 八白(8), ..., day 8 → 一白(1), day 9 → 九紫(9)
  const mod = daysSinceStart % 9;
  return (((8 - mod) % 9) + 1) as StarNumber;
}
