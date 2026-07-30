/**
 * 性質レポート(静的配信)の slug と全列挙のテスト。
 *
 * - slug 規則: "+"/"-" をファイル名/URL で安全な語に変換する
 * - 12 タイプ × 12 星座 = 144 通りが取りこぼし・重複なく列挙できる
 */

import { describe, expect, it } from "vitest";
import { CHARACTER_MAP, POTENTIAL_TYPE_IDS } from "../mapping.js";
import {
  PERSONALITY_STATIC_DIR,
  personalitySlug,
  personalityStaticFileName,
  personalityStaticPath,
  personalityTypeSlug,
} from "../personality-slug.js";
import type { PotentialTypeId, ZodiacSign } from "../types.js";
import { ZODIAC_SIGNS, computeZodiac } from "../zodiac.js";

describe("personalityTypeSlug", () => {
  it("+ を plus、- を minus に変換する", () => {
    expect(personalityTypeSlug("ER+")).toBe("er-plus");
    expect(personalityTypeSlug("IR-")).toBe("ir-minus");
    expect(personalityTypeSlug("PL+")).toBe("pl-plus");
    expect(personalityTypeSlug("EL-")).toBe("el-minus");
  });

  it("12 タイプすべてが URL 安全な文字だけになる", () => {
    for (const typeId of POTENTIAL_TYPE_IDS) {
      expect(personalityTypeSlug(typeId)).toMatch(/^[a-z]{2}-(plus|minus)$/);
    }
  });

  it("12 タイプの slug が一意である", () => {
    const slugs = POTENTIAL_TYPE_IDS.map(personalityTypeSlug);
    expect(new Set(slugs).size).toBe(12);
  });

  it("未知のタイプ ID は例外にする", () => {
    expect(() => personalityTypeSlug("XX+" as PotentialTypeId)).toThrow(/Unknown PotentialTypeId/);
  });
});

describe("personalitySlug / ファイル名 / パス", () => {
  it("タイプ slug と星座を - でつなぐ", () => {
    expect(personalitySlug("ER+", "aries")).toBe("er-plus-aries");
    expect(personalitySlug("IR-", "capricorn")).toBe("ir-minus-capricorn");
  });

  it("ファイル名は slug + .json", () => {
    expect(personalityStaticFileName("EL+", "leo")).toBe("el-plus-leo.json");
  });

  it("パスは /personality/<ファイル名>", () => {
    expect(PERSONALITY_STATIC_DIR).toBe("personality");
    expect(personalityStaticPath("EL+", "leo")).toBe("/personality/el-plus-leo.json");
  });
});

describe("タイプ × 星座の全列挙", () => {
  it("12 タイプ・12 星座である", () => {
    expect(POTENTIAL_TYPE_IDS).toHaveLength(12);
    expect(ZODIAC_SIGNS).toHaveLength(12);
    // CHARACTER_MAP と一致(別表になっていない)
    expect([...POTENTIAL_TYPE_IDS].sort()).toEqual([...CHARACTER_MAP.keys()].sort());
  });

  it("組み合わせは 144 通りで重複しない", () => {
    const slugs: string[] = [];
    for (const typeId of POTENTIAL_TYPE_IDS) {
      for (const zodiac of ZODIAC_SIGNS) {
        slugs.push(personalitySlug(typeId, zodiac));
      }
    }
    expect(slugs).toHaveLength(144);
    expect(new Set(slugs).size).toBe(144);
  });

  it("ZODIAC_SIGNS が computeZodiac の値域を取りこぼさない", () => {
    // うるう年の全日付を走査して実際に出てくる星座を集める
    const seen = new Set<ZodiacSign>();
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m += 1) {
      const last = daysInMonth[m - 1] ?? 30;
      for (let d = 1; d <= last; d += 1) {
        const date = `2024-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        seen.add(computeZodiac(date));
      }
    }
    expect(seen.size).toBe(12);
    expect([...seen].sort()).toEqual([...ZODIAC_SIGNS].sort());
  });
});
