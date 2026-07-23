import { describe, expect, it } from "vitest";
import type { BatchConfig } from "../config.js";
import { createLlmProvider } from "../llm/factory.js";

function baseConfig(overrides: Partial<BatchConfig>): BatchConfig {
  return {
    databasePath: ":memory:",
    llmProvider: "mock",
    anthropicApiKey: "",
    openaiApiKey: "",
    claudeModel: "claude-sonnet-5",
    openaiModel: "gpt-5",
    llmMaxTokens: 1024,
    dailyCron: "0 3 * * *",
    cronTimezone: "Asia/Tokyo",
    ...overrides,
  };
}

describe("createLlmProvider", () => {
  it("mock は MockLlmProvider", () => {
    const p = createLlmProvider(baseConfig({ llmProvider: "mock" }));
    expect(p.name).toBe("mock");
  });

  it("claude はキーがあれば生成でき、モデル名を name に含む", () => {
    const p = createLlmProvider(
      baseConfig({ llmProvider: "claude", anthropicApiKey: "sk-test-xxxx" }),
    );
    expect(p.name).toBe("claude:claude-sonnet-5");
  });

  it("claude でキー未設定なら分かりやすくエラー", () => {
    expect(() =>
      createLlmProvider(baseConfig({ llmProvider: "claude", anthropicApiKey: "" })),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("openai でキー未設定なら分かりやすくエラー", () => {
    expect(() =>
      createLlmProvider(baseConfig({ llmProvider: "openai", openaiApiKey: "" })),
    ).toThrow(/OPENAI_API_KEY/);
  });
});
