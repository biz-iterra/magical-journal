/**
 * キャラのトーン(語り口)ペルソナ。
 *
 * データは scripts/import-personas.mjs が profile.yaml から生成した
 * personas.generated.ts が一次情報(コミット対象)。ここではその読み出しと
 * 型・アクセサのみを提供する。
 *
 * 責務分担(CLAUDE.md ルール7・設計書§9-6):
 *   - 診断内容(タイプ名など)= タイプ仕様が正 → typeName(docs/04 適用済み・engine 由来)
 *   - 語り口(一人称・口調・世界観)= キャラが正 → name/pronoun/tone/speechExamples ほか
 *
 * ★著作権ガード: 3軸(axes)は persona に含めない。生成スクリプトが除外している。
 */

import type { PotentialTypeId } from "@mj/engine";
import { PERSONAS } from "./personas.generated.js";

/** キャラ表示スタイル */
export type CharStyle = "male" | "female";

/** 1 タイプ × 1 スタイルのトーン定義 */
export interface Persona {
  /** ポテンシャルタイプID(例 "IR+") */
  readonly typeId: PotentialTypeId;
  /** タイプ名(docs/04 適用済み。診断内容=タイプ仕様が正) */
  readonly typeName: string;
  /** 表示スタイル */
  readonly style: CharStyle;
  /** キャラ名 */
  readonly name: string;
  /** 一人称 */
  readonly pronoun: string;
  /** 口調の説明 */
  readonly tone: string;
  /** 口調の具体例(セリフ) */
  readonly speechExamples: readonly string[];
  /** キャッチコピー */
  readonly catchphrase: string;
  /** 人格コア(世界観) */
  readonly personalityCore: readonly string[];
}

/**
 * タイプ × スタイルのペルソナを取得する。
 * 見つからない場合は undefined。
 */
export function getPersona(typeId: PotentialTypeId, style: CharStyle): Persona | undefined {
  return PERSONAS[`${typeId}:${style}`];
}

/** 登録済みペルソナ数(検証用) */
export function personaCount(): number {
  return Object.keys(PERSONAS).length;
}
