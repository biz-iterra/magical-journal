/**
 * 性質レポートの構造化データ算出(決定的ロジック)。
 *
 * CLAUDE.md ルール1・6: タイプ・星座は engine でコード算出する。LLM は「その性質の
 * 説明文」を書くのみで、占い結果の新規事実を創作しない。
 * ★著作権ガード: axes(3軸)は一切注入しない。タイプ名(docs/04 適用済み)と星座のみを渡す。
 */

import type { PotentialTypeId, ZodiacSign } from "@mj/engine";
import { computePotential, computeZodiac, getCharacter } from "@mj/engine";

/** 星座の日本語名 */
const ZODIAC_JA: Readonly<Record<ZodiacSign, string>> = {
  aries: "牡羊座",
  taurus: "牡牛座",
  gemini: "双子座",
  cancer: "蟹座",
  leo: "獅子座",
  virgo: "乙女座",
  libra: "天秤座",
  scorpio: "蠍座",
  sagittarius: "射手座",
  capricorn: "山羊座",
  aquarius: "水瓶座",
  pisces: "魚座",
};

/** 性質レポートの構造化データ(LLM に渡す確定情報) */
export interface PersonalityStructured {
  readonly potentialType: PotentialTypeId;
  readonly typeName: string;
  readonly zodiac: ZodiacSign;
  readonly zodiacName: string;
}

export interface PersonalityStructuredInput {
  readonly birthDate: string;
  readonly birthTime: string | null;
}

/**
 * タイプ×星座の構造化データを算出する。
 */
export function buildPersonalityStructured(
  input: PersonalityStructuredInput,
): PersonalityStructured {
  const { birthDate, birthTime } = input;
  const potential = computePotential(birthDate, birthTime ?? undefined);
  const character = getCharacter(potential.primaryType);
  const zodiac = computeZodiac(birthDate);
  return {
    potentialType: potential.primaryType,
    typeName: character.typeName,
    zodiac,
    zodiacName: ZODIAC_JA[zodiac],
  };
}

/**
 * 再生成要否の判定に使う署名(タイプ×星座)。
 * タイプ(出生時刻変更で変わりうる)または星座が変われば再生成する。
 */
export function signatureOf(s: PersonalityStructured): string {
  return `${s.potentialType}:${s.zodiac}`;
}
