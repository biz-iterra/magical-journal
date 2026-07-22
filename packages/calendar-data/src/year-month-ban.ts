/**
 * 年盤・月盤の中宮星計算
 *
 * 気学上の年・月(立春/節入り区切り)から中宮星を算出する。
 * 盤の構築(各方位への星配置)は @mj/engine の buildBan に委譲する。
 */

import type { StarNumber } from "@mj/engine";

// ── 年盤の中宮星 ──────────────────────────────────────────

/**
 * 気学上の年から年盤の中宮星を計算する。
 *
 * 計算式: n = year % 9 (0 なら 9)、star = 11 - n (10 なら 1)
 *
 * 検証値:
 *   2024 → 三碧(3)、2025 → 二黒(2)、2026 → 一白(1)、2027 → 九紫(9)
 *
 * @param kigakuYear 気学上の年(立春区切り)
 */
export function getYearCenterStar(kigakuYear: number): StarNumber {
  let n = kigakuYear % 9;
  if (n === 0) n = 9;
  let star = 11 - n;
  if (star === 10) star = 1;
  return star as StarNumber;
}

// ── 月盤の中宮星 ──────────────────────────────────────────

/**
 * 年の九星グループごとの寅月(月=2)起点星。
 *
 * - グループ (1,4,7) → 起点 八白(8)
 * - グループ (3,6,9) → 起点 五黄(5)
 * - グループ (2,5,8) → 起点 二黒(2)
 */
function getMonthKiten(yearStar: StarNumber): StarNumber {
  if (yearStar === 1 || yearStar === 4 || yearStar === 7) return 8;
  if (yearStar === 3 || yearStar === 6 || yearStar === 9) return 5;
  // 2, 5, 8
  return 2;
}

/**
 * 気学上の年・月から月盤の中宮星を計算する。
 *
 * 寅月(月=2)の起点星から毎月 -1 で循環する。
 * 1 の次は 9 に戻る。
 *
 * @param kigakuYear 気学上の年(立春区切り)
 * @param kigakuMonth 気学上の月(1〜12)
 */
export function getMonthCenterStar(kigakuYear: number, kigakuMonth: number): StarNumber {
  const yearStar = getYearCenterStar(kigakuYear);
  const base = getMonthKiten(yearStar);

  // 寅月(2)からの経過月数
  const monthsFromTiger = (((kigakuMonth - 2) % 12) + 12) % 12;
  const star = ((((base - monthsFromTiger - 1) % 9) + 9) % 9) + 1;
  return star as StarNumber;
}
