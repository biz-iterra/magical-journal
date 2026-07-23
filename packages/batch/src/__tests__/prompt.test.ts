import { describe, expect, it } from "vitest";
import { buildDailyPrompt } from "../daily/prompt.js";
import type { DailyStructured } from "../daily/structured.js";
import type { Persona } from "../data/personas.js";

const structured: DailyStructured = {
  date: "2026-07-23",
  honmeiStar: 1,
  honmeiStarName: "一白水星",
  getsumeiStar: 6,
  getsumeiStarName: "六白金星",
  dayCenterStar: 5,
  dayCenterStarName: "五黄土星",
  potentialType: "IL+",
  typeName: "個性的な理論派",
  goodDirections: [
    { direction: "N", label: "北", star: 3, starName: "三碧木星", level: "最大吉方" },
  ],
  badDirections: [
    { direction: "S", label: "南", star: 5, starName: "五黄土星", misfortunes: ["五黄殺"] },
  ],
};

const persona: Persona = {
  typeId: "IL+",
  typeName: "個性的な理論派",
  style: "male",
  name: "カゼマ",
  pronoun: "俺",
  tone: "クールで理屈っぽい",
  speechExamples: ["論理的に言えば、こうだ"],
  catchphrase: "理論こそすべて",
  personalityCore: ["理論派", "個性的"],
};

describe("buildDailyPrompt", () => {
  it("persona のトーンを system に注入する", () => {
    const { system } = buildDailyPrompt(structured, persona);
    expect(system).toContain("カゼマ");
    expect(system).toContain("俺");
    expect(system).toContain("クールで理屈っぽい");
    expect(system).toContain("論理的に言えば、こうだ");
  });

  it("user に構造化データをラベル形式で載せる(Mock が解釈可能)", () => {
    const { user } = buildDailyPrompt(structured, persona);
    expect(user).toContain("日付: 2026-07-23");
    expect(user).toContain("タイプ名: 個性的な理論派");
    expect(user).toContain("キャラ名: カゼマ");
    expect(user).toContain("本命星: 一白水星");
    expect(user).toContain("最大吉方=北(三碧木星)");
    expect(user).toContain("南(五黄殺)");
  });

  it("persona 無しでも中立ボイスにフォールバックする", () => {
    const { system, user } = buildDailyPrompt(structured, undefined);
    expect(system).toContain("ナビゲーター");
    expect(user).toContain("キャラ名: ナビ");
  });

  it("★著作権ガード: プロンプトに axes(3軸)語彙を注入しない", () => {
    const { system, user } = buildDailyPrompt(structured, persona);
    for (const axisWord of ["axes", "頭脳", "右脳", "左脳", "perspective"]) {
      expect(system).not.toContain(axisWord);
      expect(user).not.toContain(axisWord);
    }
  });
});
