import { describe, expect, it } from "vitest";
import type { Persona } from "../data/personas.js";
import { buildMonthlyPrompt } from "../monthly/prompt.js";
import type { MonthlyStructured } from "../monthly/structured.js";

const structured: MonthlyStructured = {
  kigakuYear: 2026,
  kigakuMonth: 7,
  honmeiStar: 1,
  honmeiStarName: "一白水星",
  getsumeiStar: 6,
  getsumeiStarName: "六白金星",
  monthCenterStar: 5,
  monthCenterStarName: "五黄土星",
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

describe("buildMonthlyPrompt", () => {
  it("persona のトーンを system に注入し、今月視点を指示する", () => {
    const { system } = buildMonthlyPrompt(structured, persona);
    expect(system).toContain("カゼマ");
    expect(system).toContain("俺");
    expect(system).toContain("クールで理屈っぽい");
    expect(system).toContain("論理的に言えば、こうだ");
    // 月運は「今月」視点で書くよう指示
    expect(system).toContain("今月");
  });

  it("user に構造化データをラベル形式で載せる(Mock が解釈可能)", () => {
    const { user } = buildMonthlyPrompt(structured, persona);
    expect(user).toContain("気学7月");
    expect(user).toContain("タイプ名: 個性的な理論派");
    expect(user).toContain("キャラ名: カゼマ");
    expect(user).toContain("本命星: 一白水星");
    expect(user).toContain("月盤中宮: 五黄土星");
    expect(user).toContain("最大吉方=北(三碧木星)");
    expect(user).toContain("南(五黄殺)");
  });

  it("persona 無しでも中立ボイスにフォールバックする", () => {
    const { system, user } = buildMonthlyPrompt(structured, undefined);
    expect(system).toContain("ナビゲーター");
    expect(user).toContain("キャラ名: ナビ");
  });

  it("★著作権ガード: プロンプトに axes(3軸)語彙を注入しない", () => {
    const { system, user } = buildMonthlyPrompt(structured, persona);
    for (const axisWord of ["axes", "頭脳", "右脳", "左脳", "perspective"]) {
      expect(system).not.toContain(axisWord);
      expect(user).not.toContain(axisWord);
    }
  });
});
