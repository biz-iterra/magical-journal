import { describe, expect, it } from "vitest";
import { PERSONAS } from "../data/personas.generated.js";
import { getPersona, personaCount } from "../data/personas.js";

describe("personas", () => {
  it("12タイプ × 2スタイル = 24 バリアントが揃っている", () => {
    expect(personaCount()).toBe(24);
  });

  it("getPersona でタイプ×スタイルを引ける", () => {
    const p = getPersona("IR+", "male");
    expect(p).toBeDefined();
    expect(p?.typeId).toBe("IR+");
    expect(p?.style).toBe("male");
    expect(p?.name.length).toBeGreaterThan(0);
    expect(p?.tone.length).toBeGreaterThan(0);
  });

  it("不正なスタイルの組み合わせは undefined ではなく型で弾く(存在するキーのみ)", () => {
    const male = getPersona("EL+", "male");
    const female = getPersona("EL+", "female");
    expect(male?.name).not.toBe(female?.name);
  });

  it("★著作権ガード: persona に axes 由来のフィールドが混入していない", () => {
    for (const [key, persona] of Object.entries(PERSONAS)) {
      const record = persona as unknown as Record<string, unknown>;
      expect(record.axes, `${key} に axes`).toBeUndefined();
      expect(record.output, `${key} に output 軸`).toBeUndefined();
      expect(record.input, `${key} に input 軸`).toBeUndefined();
      expect(record.perspective, `${key} に perspective 軸`).toBeUndefined();
      // 診断寄りフィールドもトーン注入には持ち込まない
      expect(record.strengths, `${key} に strengths`).toBeUndefined();
      expect(record.weaknesses, `${key} に weaknesses`).toBeUndefined();
    }
  });
});
