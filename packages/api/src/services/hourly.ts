/**
 * 時盤(2時間ごとの方位盤)の応答整形。
 *
 * 計算そのものは engine の純関数(computeDayHourBans / judgeDirections)に閉じており、
 * ここは「12刻ぶんを API の応答形に整える」だけの薄い層(DB もマスタも増やさない)。
 *
 * ★破の判定に渡す十二支は「その刻の十二支」= period.index(刻の index は十二支番号と一致)。
 *   日の十二支ではない。
 */

import { computeDayHourBans, judgeDirections } from "@mj/engine";
import type { DirectionResult, StarNumber, TonpuMode } from "@mj/engine";

/** 1 刻ぶんの応答 */
export interface HourlyDirections {
  /** 刻の番号 = 十二支番号(0=子刻 … 11=亥刻) */
  readonly index: number;
  /** 表示ラベル(例: "1:00〜3:00") */
  readonly label: string;
  /** 開始時(24 時制)。子刻は 23 */
  readonly startHour: number;
  /** 終了時(24 時制)。子刻は 1(日をまたぐ) */
  readonly endHour: number;
  /** その刻の中宮星 */
  readonly center: StarNumber;
  /** 8 方位ぶんの吉凶判定(日盤と同じ体系) */
  readonly directions: readonly DirectionResult[];
}

/**
 * 対象日の 12 刻すべての時盤 + 方位判定を index 順(0=子刻 … 11=亥刻)で返す。
 *
 * 12 刻を一度に返し、UI 側はスライダーで切り替えるだけで済むようにする
 * (追加リクエスト不要)。
 *
 * @param dayJunishi   その日の十二支番号(0=子 … 11=亥)
 * @param tonpu        その日の遁(陽遁/陰遁)
 * @param honmeiStar   本命星
 * @param getsumeiStar 月命星
 */
export function buildHourlyDirections(
  dayJunishi: number,
  tonpu: TonpuMode,
  honmeiStar: StarNumber,
  getsumeiStar: StarNumber,
): readonly HourlyDirections[] {
  return computeDayHourBans(dayJunishi, tonpu).map((hourBan) => ({
    index: hourBan.period.index,
    label: hourBan.period.label,
    startHour: hourBan.period.startHour,
    endHour: hourBan.period.endHour,
    center: hourBan.center,
    directions: judgeDirections(hourBan.ban, honmeiStar, getsumeiStar, hourBan.period.index),
  }));
}
