import type { Ban, Direction8, StarNumber } from "../types.js";

// ── 配置順(定位順) ──────────────────────────────────────────
// 中宮から +1 ずつ、この順番に配置する。
// 仕様書: 中宮 → 北西 → 西 → 北東 → 南 → 北 → 南西 → 東 → 南東

const PLACEMENT_ORDER: readonly Direction8[] = ["NW", "W", "NE", "S", "N", "SW", "E", "SE"];

// ── 後天定位盤の各星の定位置(固定値・変更禁止) ──────────────

/**
 * 後天定位盤における各星の定位置。
 * 五黄(5)は中宮なので方位を持たない(定位対冲の対象外)。
 */
export const JYOUI_POSITIONS: Readonly<Partial<Record<StarNumber, Direction8>>> = {
  1: "N",
  2: "SW",
  3: "E",
  4: "SE",
  // 5 は中宮(方位なし)
  6: "NW",
  7: "W",
  8: "NE",
  9: "S",
};

// ── 盤の構築 ────────────────────────────────────────────────

/**
 * 中宮星から盤(Ban)を構築する。
 *
 * 配置順(定位順)に中宮星から +1 ずつ配置し、9 の次は 1 に循環する。
 *
 * 例: center=5(五黄) → 後天定位盤そのもの
 *   SE(4) S(9) SW(2)
 *   E(3)  中(5) W(7)
 *   NE(8) N(1) NW(6)
 */
export function buildBan(centerStar: StarNumber): Ban {
  const positions = {} as Record<Direction8, StarNumber>;
  let current = centerStar;

  for (const dir of PLACEMENT_ORDER) {
    current = nextStar(current);
    positions[dir] = current;
  }

  return { center: centerStar, positions };
}

/** 九星の次の番号を返す(9→1 に循環) */
function nextStar(star: StarNumber): StarNumber {
  return (star === 9 ? 1 : star + 1) as StarNumber;
}

// ── 反対方位 ────────────────────────────────────────────────

const OPPOSITE_MAP: Readonly<Record<Direction8, Direction8>> = {
  N: "S",
  S: "N",
  NE: "SW",
  SW: "NE",
  E: "W",
  W: "E",
  SE: "NW",
  NW: "SE",
};

/** 反対方位を返す */
export function getOppositeDirection(dir: Direction8): Direction8 {
  return OPPOSITE_MAP[dir];
}
