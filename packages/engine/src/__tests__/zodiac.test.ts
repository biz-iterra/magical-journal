import { describe, expect, it } from "vitest";
import type { ZodiacSign } from "../types.js";
import { computeZodiac, zodiacModule } from "../zodiac.js";

// ── computeZodiac 単体テスト ──

describe("computeZodiac", () => {
  // 各星座の境界日(開始日と終了日)を網羅

  const cases: [string, string, ZodiacSign][] = [
    // 牡羊座 3/21〜4/19
    ["aries start", "2000-03-21", "aries"],
    ["aries end", "2000-04-19", "aries"],

    // 牡牛座 4/20〜5/20
    ["taurus start", "2000-04-20", "taurus"],
    ["taurus end", "2000-05-20", "taurus"],

    // 双子座 5/21〜6/21
    ["gemini start", "2000-05-21", "gemini"],
    ["gemini end", "2000-06-21", "gemini"],

    // 蟹座 6/22〜7/22
    ["cancer start", "2000-06-22", "cancer"],
    ["cancer end", "2000-07-22", "cancer"],

    // 獅子座 7/23〜8/22
    ["leo start", "2000-07-23", "leo"],
    ["leo end", "2000-08-22", "leo"],

    // 乙女座 8/23〜9/22
    ["virgo start", "2000-08-23", "virgo"],
    ["virgo end", "2000-09-22", "virgo"],

    // 天秤座 9/23〜10/23
    ["libra start", "2000-09-23", "libra"],
    ["libra end", "2000-10-23", "libra"],

    // 蠍座 10/24〜11/22
    ["scorpio start", "2000-10-24", "scorpio"],
    ["scorpio end", "2000-11-22", "scorpio"],

    // 射手座 11/23〜12/21
    ["sagittarius start", "2000-11-23", "sagittarius"],
    ["sagittarius end", "2000-12-21", "sagittarius"],

    // 山羊座 12/22〜1/19(年またぎ)
    ["capricorn start (Dec)", "2000-12-22", "capricorn"],
    ["capricorn end (Dec)", "2000-12-31", "capricorn"],
    ["capricorn start (Jan)", "2001-01-01", "capricorn"],
    ["capricorn end (Jan)", "2001-01-19", "capricorn"],

    // 水瓶座 1/20〜2/18
    ["aquarius start", "2000-01-20", "aquarius"],
    ["aquarius end", "2000-02-18", "aquarius"],

    // 魚座 2/19〜3/20
    ["pisces start", "2000-02-19", "pisces"],
    ["pisces end", "2000-03-20", "pisces"],
  ];

  it.each(cases)("%s: %s -> %s", (_label, birthDate, expected) => {
    expect(computeZodiac(birthDate)).toBe(expected);
  });

  // 境界の前日が前の星座であることを確認(隣接テスト)
  describe("境界前日は前の星座", () => {
    const adjacentCases: [string, string, ZodiacSign][] = [
      ["aries の前日は pisces", "2000-03-20", "pisces"],
      ["taurus の前日は aries", "2000-04-19", "aries"],
      ["gemini の前日は taurus", "2000-05-20", "taurus"],
      ["cancer の前日は gemini", "2000-06-21", "gemini"],
      ["leo の前日は cancer", "2000-07-22", "cancer"],
      ["virgo の前日は leo", "2000-08-22", "leo"],
      ["libra の前日は virgo", "2000-09-22", "virgo"],
      ["scorpio の前日は libra", "2000-10-23", "libra"],
      ["sagittarius の前日は scorpio", "2000-11-22", "scorpio"],
      ["capricorn の前日は sagittarius", "2000-12-21", "sagittarius"],
      ["aquarius の前日は capricorn", "2000-01-19", "capricorn"],
      ["pisces の前日は aquarius", "2000-02-18", "aquarius"],
    ];

    it.each(adjacentCases)("%s: %s -> %s", (_label, birthDate, expected) => {
      expect(computeZodiac(birthDate)).toBe(expected);
    });
  });
});

// ── zodiacModule (DiagnosisModule) テスト ──

describe("zodiacModule", () => {
  it("id / version / requiredInputs / clientSafe が正しい", () => {
    expect(zodiacModule.id).toBe("zodiac");
    expect(zodiacModule.version).toBe(1);
    expect(zodiacModule.requiredInputs).toEqual(["birth_date"]);
    expect(zodiacModule.optionalInputs).toEqual([]);
    expect(zodiacModule.clientSafe).toBe(true);
  });

  it("compute が正しい結果を返す", () => {
    const result = zodiacModule.compute({ birthDate: "1990-05-17" });
    expect(result).toEqual({ sign: "taurus" });
  });

  it("compute で山羊座の年またぎ(12月)が正しく動作する", () => {
    const result = zodiacModule.compute({ birthDate: "1988-12-25" });
    expect(result).toEqual({ sign: "capricorn" });
  });

  it("compute で山羊座の年またぎ(1月)が正しく動作する", () => {
    const result = zodiacModule.compute({ birthDate: "2000-01-05" });
    expect(result).toEqual({ sign: "capricorn" });
  });
});
