import { describe, expect, it } from "vitest";
import { MockLlmProvider } from "../llm/mock.js";

describe("MockLlmProvider", () => {
  const provider = new MockLlmProvider();

  it("name は mock", () => {
    expect(provider.name).toBe("mock");
  });

  it("同一プロンプトなら決定的に同一出力", async () => {
    const prompt = {
      system: "s",
      user: "日付: 2026-07-23\nタイプ名: 個性的な理論派\nキャラ名: カゼマ",
    };
    const a = await provider.generate(prompt);
    const b = await provider.generate(prompt);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("user プロンプトの日付・タイプ名・キャラ名を反映する", async () => {
    const text = await provider.generate({
      system: "s",
      user: "日付: 2026-07-23\nタイプ名: 個性的な理論派\nキャラ名: カゼマ",
    });
    expect(text).toContain("2026-07-23");
    expect(text).toContain("個性的な理論派");
    expect(text).toContain("カゼマ");
  });

  it("ラベルが無くてもフォールバックで生成する", async () => {
    const text = await provider.generate({ system: "s", user: "情報なし" });
    expect(text.length).toBeGreaterThan(0);
  });
});
