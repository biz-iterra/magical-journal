import type { Direction8, DirectionFortune, MisfortuneType } from "@mj/engine";

/**
 * 方位盤とその詳細モーダルで共用する表示ラベル。
 *
 * 盤とモーダルで語彙がずれると別物に見えるため、必ずここを唯一の定義とする。
 * 判定そのもの(吉凶・凶方位の種類)は API / engine の結果をそのまま使い、UI では再計算しない。
 */

export const DIR_LABELS: Record<Direction8, string> = {
  N: "北",
  NE: "北東",
  E: "東",
  SE: "南東",
  S: "南",
  SW: "南西",
  W: "西",
  NW: "北西",
};

export const MISFORTUNE_LABELS: Record<MisfortuneType, string> = {
  goou_satsu: "五黄殺",
  anken_satsu: "暗剣殺",
  saiha: "歳破",
  geppa: "月破",
  nippa: "日破",
  jouiTaichu: "定位対冲",
  honmei_satsu: "本命殺",
  honmei_tekisatsu: "本命的殺",
  getsumei_satsu: "月命殺",
  getsumei_tekisatsu: "月命的殺",
};

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
