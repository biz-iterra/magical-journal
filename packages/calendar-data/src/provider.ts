/**
 * CalendarProvider 実装(MasterCalendarProvider)
 *
 * 節入りデータ(sekki-data.ts)を参照して気学上の年・月を解決し、
 * 年盤・月盤を buildBan で構築する。
 *
 * 日盤は陽遁/陰遁サイクルで中宮星を算出(day-ban.ts)。
 */

import type {
  Ban,
  CalendarProvider,
  SekkiriBoundary,
  StarNumber,
} from "@mj/engine";
import { buildBan } from "@mj/engine";

import { SEKKI_DATA } from "./sekki-data.js";
import { getDayJunishi, getMonthJunishi, getYearJunishi } from "./junishi.js";
import { getMonthCenterStar, getYearCenterStar } from "./year-month-ban.js";
import { getDayCenterStar } from "./day-ban.js";

/**
 * マスタデータベースの CalendarProvider。
 *
 * - 節入り: sekki-data.ts の静的テーブルから取得
 * - 年盤・月盤: 算出式(year-month-ban.ts)で中宮星を求め、buildBan で構築
 * - 十二支: 算出式(junishi.ts)
 * - 日盤: 陽遁/陰遁サイクルによる中宮星算出(day-ban.ts) + buildBan
 */
export class MasterCalendarProvider implements CalendarProvider {
  // ── CalendarProvider インターフェース ──────────────────

  getSekkiriBoundaries(year: number): readonly SekkiriBoundary[] {
    const data = SEKKI_DATA.get(year);
    if (data === undefined) {
      throw new Error(
        `Sekki data not available for year ${String(year)}. ` +
          `Available range: ${this.availableYearRange()}.`,
      );
    }
    return data;
  }

  getYearBan(year: number): Ban {
    const center = getYearCenterStar(year);
    return buildBan(center);
  }

  getMonthBan(year: number, month: number): Ban {
    const center = getMonthCenterStar(year, month);
    return buildBan(center);
  }

  getDayBan(date: string): Ban {
    const center = getDayCenterStar(date);
    return buildBan(center);
  }

  getYearJunishi(year: number): number {
    return getYearJunishi(year);
  }

  getMonthJunishi(_year: number, month: number): number {
    return getMonthJunishi(month);
  }

  getDayJunishi(date: string): number {
    return getDayJunishi(date);
  }

  // ── 気学上の年・月の解決(公開ヘルパー) ────────────────

  /**
   * グレゴリオ暦の日付から気学上の年を返す。
   * 立春(month=2 の節入り日)より前なら前年扱い。
   *
   * @param date "YYYY-MM-DD" 形式
   */
  getKigakuYear(date: string): number {
    const calendarYear = Number(date.split("-")[0]);
    const boundaries = this.getSekkiriBoundaries(calendarYear);
    const risshun = boundaries.find((b) => b.month === 2);

    if (risshun === undefined) {
      throw new Error(
        `Risshun (month=2) boundary not found for year ${String(calendarYear)}.`,
      );
    }

    if (date < risshun.date) {
      return calendarYear - 1;
    }
    return calendarYear;
  }

  /**
   * グレゴリオ暦の日付から気学上の月(1〜12)を返す。
   * 各月の節入り日をまたぐタイミングで切り替わる。
   *
   * @param date "YYYY-MM-DD" 形式
   */
  getKigakuMonth(date: string): number {
    const calendarYear = Number(date.split("-")[0]);
    const boundaries = this.getSekkiriBoundaries(calendarYear);

    // 日付順にソート
    const sorted = [...boundaries].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );

    // 後ろから走査して date >= boundary.date の最初の境界を見つける
    for (let i = sorted.length - 1; i >= 0; i--) {
      const boundary = sorted[i]!;
      if (date >= boundary.date) {
        return boundary.month;
      }
    }

    // すべての境界より前(=当年の小寒より前)
    // 前年の境界を参照して判定する
    const prevBoundaries = this.getSekkiriBoundaries(calendarYear - 1);
    const prevSorted = [...prevBoundaries].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );

    for (let i = prevSorted.length - 1; i >= 0; i--) {
      const boundary = prevSorted[i]!;
      if (date >= boundary.date) {
        return boundary.month;
      }
    }

    throw new Error(
      `Could not determine kigaku month for ${date}.`,
    );
  }

  // ── 内部ヘルパー ──────────────────────────────────────

  private availableYearRange(): string {
    const years = [...SEKKI_DATA.keys()].sort((a, b) => a - b);
    if (years.length === 0) return "(none)";
    return `${String(years[0])}~${String(years[years.length - 1])}`;
  }
}
