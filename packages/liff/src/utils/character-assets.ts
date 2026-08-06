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

/**
 * タイプ ID → キャラの自然モチーフ(1 文字)。
 *
 * 出典: docs/05 キャラマッピング表 / キャラ YAML の自然モチーフ。
 * 「今日のページ」W-1 ヘッダーのキャラ章など、キャラ本体を描かずに
 * 気配だけを示す小さなマークで使う(デザイン計画書 §4 シグネチャ)。
 */
const CHARACTER_MOTIF: Readonly<Record<PotentialTypeId, string>> = {
  "IR+": "光",
  "IR-": "月",
  "IL+": "風",
  "IL-": "霧",
  "PR+": "炎",
  "PR-": "滝",
  "PL+": "山",
  "PL-": "岩",
  "ER+": "虹",
  "ER-": "露",
  "EL+": "陽",
  "EL-": "湖",
};

/** キャラの自然モチーフ 1 文字を返す。 */
export function characterMotif(typeId: PotentialTypeId): string {
  return CHARACTER_MOTIF[typeId];
}
