/**
 * 性質レポート(AI占い)の静的配信で使う slug。
 *
 * 性質レポートは「タイプ × 星座」だけで決まる(12 × 12 = 144 通り)。個人ごとに
 * 異なる内容ではないため、事前生成した静的 JSON を配信する。友達診断はこの静的
 * ファイルを読むだけなので、友達の入力値(生年月日など)をサーバーへ送らずに済む
 * (CLAUDE.md ルール5「第三者情報を預からない」)。
 *
 * slug 規則: タイプ ID の記号をファイル名/URL で安全な語に置き換える。
 *   "ER+" → "er-plus" / "IR-" → "ir-minus"
 *   フル slug は `<タイプ slug>-<星座>` 例: "er-plus-aries"
 *   ファイル名は `<フル slug>.json` 例: "er-plus-aries.json"
 *
 * ★この関数は生成側(Node: packages/batch)と表示側(ブラウザ: packages/liff)の
 *   両方から使う。DOM / Node API に依存させない。
 */

import { CHARACTER_MAP } from "./mapping.js";
import type { PotentialTypeId, ZodiacSign } from "./types.js";

/**
 * 静的レポートを置くディレクトリ名。
 * 生成側は `packages/liff/public/<ここ>/`、表示側は `/<ここ>/<file>` を参照する。
 */
export const PERSONALITY_STATIC_DIR = "personality";

/**
 * タイプ ID をファイル名/URL で安全な slug に変換する。
 * @throws 未知のタイプ ID の場合(表記ゆれをファイル名に持ち込ませない)
 */
export function personalityTypeSlug(typeId: PotentialTypeId): string {
  if (!CHARACTER_MAP.has(typeId)) {
    throw new Error(`Unknown PotentialTypeId: ${typeId}`);
  }
  const base = typeId.slice(0, 2).toLowerCase();
  const polarity = typeId.endsWith("+") ? "plus" : "minus";
  return `${base}-${polarity}`;
}

/** タイプ × 星座の slug(例: "er-plus-aries") */
export function personalitySlug(typeId: PotentialTypeId, zodiac: ZodiacSign): string {
  return `${personalityTypeSlug(typeId)}-${zodiac}`;
}

/** タイプ × 星座の静的ファイル名(例: "er-plus-aries.json") */
export function personalityStaticFileName(typeId: PotentialTypeId, zodiac: ZodiacSign): string {
  return `${personalitySlug(typeId, zodiac)}.json`;
}

/** ブラウザから読む静的ファイルのパス(例: "/personality/er-plus-aries.json") */
export function personalityStaticPath(typeId: PotentialTypeId, zodiac: ZodiacSign): string {
  return `/${PERSONALITY_STATIC_DIR}/${personalityStaticFileName(typeId, zodiac)}`;
}
