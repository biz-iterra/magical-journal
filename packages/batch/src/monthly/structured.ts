/**
 * 今月(気学月)の構造化データ算出(決定的ロジック)。
 *
 * CLAUDE.md ルール1・6: 方位・暦・診断はすべて engine / 暦マスタでコード算出する。
 * LLM には本モジュールが返す構造化サマリのみを渡す(LLM は文章生成のみ)。
 * 月運は「今月の傾向」なので日盤ではなく月盤ベースで判定する。
 * ロジックは packages/api/src/routes/monthly.ts / today.ts と同一の engine 呼び出しに準拠。
 */

import type { CalendarProvider, Direction8, MisfortuneType, StarNumber } from "@mj/engine";
import {
  DIRECTION_NAMES,
  MISFORTUNE_LABELS,
  STAR_NAMES,
  computeGetsumeiStar,
  computeHonmeiStar,
  computePotential,
  getCharacter,
  judgeDirections,
} from "@mj/engine";
import type { PotentialTypeId } from "@mj/engine";

/**
 * 気学の年・月を求める CalendarProvider(節入り基準)。
 * MasterCalendarProvider は getKigakuYear/getKigakuMonth を持つが、
 * engine の CalendarProvider インターフェースには含まれないためここで拡張する。
 */
export interface MonthlyCalendarProvider extends CalendarProvider {
  getKigakuYear(date: string): number;
  getKigakuMonth(date: string): number;
}

// 九星名・方位名・凶方位名は engine のマスタが正本。ここで表を作り直さない
// (docs/14 の文言変更が一部の画面にしか効かない、という事故を防ぐ)。
const DIRECTION_LABELS = DIRECTION_NAMES;

/** 方位1件の情報 */
export interface DirectionInfo {
  readonly direction: Direction8;
  readonly label: string;
  readonly star: StarNumber;
  readonly starName: string;
}

/** 吉方位(吉レベル付き) */
export interface GoodDirectionInfo extends DirectionInfo {
  readonly level: "最大吉方" | "吉方";
}

/** 凶方位(凶種別の日本語ラベル付き) */
export interface BadDirectionInfo extends DirectionInfo {
  readonly misfortunes: readonly string[];
}

/** 今月の構造化データ */
export interface MonthlyStructured {
  /** 気学年(節入り基準。カレンダー年とはずれる) */
  readonly kigakuYear: number;
  /** 気学月(1〜12。節入り基準) */
  readonly kigakuMonth: number;
  readonly honmeiStar: StarNumber;
  readonly honmeiStarName: string;
  readonly getsumeiStar: StarNumber;
  readonly getsumeiStarName: string;
  /** 月盤中宮の星 */
  readonly monthCenterStar: StarNumber;
  readonly monthCenterStarName: string;
  readonly potentialType: PotentialTypeId;
  readonly typeName: string;
  readonly goodDirections: readonly GoodDirectionInfo[];
  readonly badDirections: readonly BadDirectionInfo[];
}

export interface MonthlyStructuredInput {
  readonly birthDate: string;
  readonly birthTime: string | null;
  /** 対象日付("YYYY-MM-DD"。ここから気学年・気学月を求める) */
  readonly date: string;
}

/**
 * 今月の構造化データを算出する。
 * @param input ユーザーの生年月日・出生時刻と対象日付("YYYY-MM-DD")
 * @param calendar 気学年・月を求められる暦マスタプロバイダ
 */
export function buildMonthlyStructured(
  input: MonthlyStructuredInput,
  calendar: MonthlyCalendarProvider,
): MonthlyStructured {
  const { birthDate, birthTime, date } = input;

  // 本命星・月命星(立春・節入り基準)
  const honmeiStar = computeHonmeiStar(birthDate, calendar);
  const getsumeiStar = computeGetsumeiStar(honmeiStar, birthDate, calendar);

  // 現在の気学年・気学月(節入り基準)と月盤・月方位判定
  const kigakuYear = calendar.getKigakuYear(date);
  const kigakuMonth = calendar.getKigakuMonth(date);
  const monthBan = calendar.getMonthBan(kigakuYear, kigakuMonth);
  const monthJunishi = calendar.getMonthJunishi(kigakuYear, kigakuMonth);
  const directions = judgeDirections(monthBan, honmeiStar, getsumeiStar, monthJunishi, "month");

  // ポテンシャルタイプ(診断内容=タイプ仕様が正。docs/04 適用済みの typeName を使う)
  const potential = computePotential(birthDate, birthTime ?? undefined);
  const character = getCharacter(potential.primaryType);

  const goodDirections: GoodDirectionInfo[] = [];
  const badDirections: BadDirectionInfo[] = [];

  for (const d of directions) {
    const base: DirectionInfo = {
      direction: d.direction,
      label: DIRECTION_LABELS[d.direction],
      star: d.star,
      starName: STAR_NAMES[d.star],
    };
    if (d.fortune === "great_fortune" || d.fortune === "fortune") {
      goodDirections.push({
        ...base,
        level: d.fortune === "great_fortune" ? "最大吉方" : "吉方",
      });
    } else if (d.fortune === "misfortune") {
      badDirections.push({
        ...base,
        misfortunes: d.misfortunes.map((m) => MISFORTUNE_LABELS[m]),
      });
    }
  }

  return {
    kigakuYear,
    kigakuMonth,
    honmeiStar,
    honmeiStarName: STAR_NAMES[honmeiStar],
    getsumeiStar,
    getsumeiStarName: STAR_NAMES[getsumeiStar],
    monthCenterStar: monthBan.center,
    monthCenterStarName: STAR_NAMES[monthBan.center],
    potentialType: potential.primaryType,
    typeName: character.typeName,
    goodDirections,
    badDirections,
  };
}
