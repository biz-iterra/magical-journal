/**
 * キャラ画像アセットのパス解決。
 *
 * 画像は scripts/import-characters.mjs がキャラリポジトリ(一次情報)から
 * public/characters/NN-name/{male,female}.webp へ取り込んだものを参照する。
 */

import type { PotentialTypeId } from "@mj/engine";
import { getCharacter } from "@mj/engine";

/**
 * タイプ ID とスタイルからキャラ画像の URL パスを返す。
 * 例: IL+ / male -> "/characters/03-kazema/male.webp"
 */
export function characterImagePath(typeId: PotentialTypeId, style: "male" | "female"): string {
  // directoryKey は "characters/03-kazema/" 形式(キャラリポジトリのキー)
  const dirKey = getCharacter(typeId).directoryKey.replace(/\/$/, "");
  return `/${dirKey}/${style}.webp`;
}
