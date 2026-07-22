import type { DiagnosisModule, ProfileInputs, ZodiacSign } from "./types.js";

// ── 星座境界テーブル ────────────────────────────────────────
// [month, startDay, sign] の昇順。月日を先頭から走査し、
// 該当しなければ最後のエントリ(山羊座 12/22〜)にフォールバックする。

const ZODIAC_BOUNDARIES: readonly [number, number, ZodiacSign][] = [
  [1, 20, "aquarius"],    // 1/20〜2/18
  [2, 19, "pisces"],      // 2/19〜3/20
  [3, 21, "aries"],       // 3/21〜4/19
  [4, 20, "taurus"],      // 4/20〜5/20
  [5, 21, "gemini"],      // 5/21〜6/21
  [6, 22, "cancer"],      // 6/22〜7/22
  [7, 23, "leo"],         // 7/23〜8/22
  [8, 23, "virgo"],       // 8/23〜9/22
  [9, 23, "libra"],       // 9/23〜10/23
  [10, 24, "scorpio"],    // 10/24〜11/22
  [11, 23, "sagittarius"], // 11/23〜12/21
  [12, 22, "capricorn"],  // 12/22〜1/19
];

/**
 * 生年月日から星座を判定する。
 * @param birthDate "YYYY-MM-DD" 形式
 * @returns 12星座のいずれか
 */
export function computeZodiac(birthDate: string): ZodiacSign {
  const parts = birthDate.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  // テーブルを逆順に走査し、(month, day) が境界以降ならその星座
  for (let i = ZODIAC_BOUNDARIES.length - 1; i >= 0; i--) {
    const entry = ZODIAC_BOUNDARIES[i]!;
    const [bMonth, bDay, sign] = entry;
    if (month > bMonth || (month === bMonth && day >= bDay)) {
      return sign;
    }
  }

  // 1/1〜1/19 はどの境界にも当たらない → 山羊座
  return "capricorn";
}

// ── DiagnosisModule 定義 ────────────────────────────────────

export const zodiacModule: DiagnosisModule = {
  id: "zodiac",
  version: 1,
  requiredInputs: ["birth_date"],
  optionalInputs: [],
  clientSafe: true,
  compute(inputs: ProfileInputs): { sign: ZodiacSign } {
    return { sign: computeZodiac(inputs.birthDate) };
  },
};
