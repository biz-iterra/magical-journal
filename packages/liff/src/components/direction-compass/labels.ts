import type { Direction8, DirectionFortune } from "@mj/engine";
import { DIRECTION_EFFECTS, MISFORTUNE_LABELS } from "@mj/engine";

/**
 * 方位盤とその詳細モーダルで共用する表示ラベル。
 *
 * 盤とモーダルで語彙がずれると別物に見えるため、必ずここを唯一の定義とする。
 * 判定そのもの(吉凶・凶方位の種類)は API / engine の結果をそのまま使い、UI では再計算しない。
 *
 * ★方位名・凶方位名は engine のマスタが正本。ここで作り直さない。
 *   以前は凶方位名を独自に持っていたため、日盤の日破が「歳破」と表示されていた。
 */

export const DIR_LABELS: Record<Direction8, string> = {
  N: DIRECTION_EFFECTS.N.name,
  NE: DIRECTION_EFFECTS.NE.name,
  E: DIRECTION_EFFECTS.E.name,
  SE: DIRECTION_EFFECTS.SE.name,
  S: DIRECTION_EFFECTS.S.name,
  SW: DIRECTION_EFFECTS.SW.name,
  W: DIRECTION_EFFECTS.W.name,
  NW: DIRECTION_EFFECTS.NW.name,
};

export { MISFORTUNE_LABELS };

/**
 * 盤のセルに出す吉のラベル(吉・大吉のみ。凶と平は別扱い)。
 * 盤の見た目を変えないため、既存の挙動をそのまま踏襲する。
 */
export function fortuneLabel(fortune: DirectionFortune): string | null {
  switch (fortune) {
    case "great_fortune":
      return "大吉";
    case "fortune":
      return "吉";
    default:
      return null;
  }
}

/** モーダル見出し用。4 値すべてに語を与える(盤の語彙と揃える) */
export function fortuneLabelFull(fortune: DirectionFortune): string {
  switch (fortune) {
    case "great_fortune":
      return "大吉";
    case "fortune":
      return "吉";
    case "misfortune":
      return "凶";
    default:
      return "平";
  }
}

/** その日その方位が吉方位として成立しているか(表示の主従を決めるためだけに使う) */
export function isFavorable(fortune: DirectionFortune): boolean {
  return fortune === "great_fortune" || fortune === "fortune";
}
