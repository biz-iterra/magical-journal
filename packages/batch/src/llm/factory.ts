/**
 * LlmProvider ファクトリ。LLM_PROVIDER 設定でプロバイダを切り替える。
 * APIキー未設定時は各プロバイダのコンストラクタが分かりやすくエラーを投げる。
 */

import type { BatchConfig } from "../config.js";
import { ClaudeProvider } from "./claude.js";
import { MockLlmProvider } from "./mock.js";
import { OpenAiProvider } from "./openai.js";
import type { LlmProvider } from "./provider.js";

/**
 * config に従って LlmProvider を生成する。
 * @throws プロバイダ種別が不正、または必須キーが未設定の場合
 */
export function createLlmProvider(config: BatchConfig): LlmProvider {
  switch (config.llmProvider) {
    case "claude":
      return new ClaudeProvider({
        apiKey: config.anthropicApiKey,
        model: config.claudeModel,
        maxTokens: config.llmMaxTokens,
      });
    case "openai":
      return new OpenAiProvider({
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
        maxTokens: config.llmMaxTokens,
      });
    case "mock":
      return new MockLlmProvider();
    default: {
      // 到達不能(config.ts で検証済み)。網羅性を型で担保する。
      const exhaustive: never = config.llmProvider;
      throw new Error(`未知の LLM_PROVIDER: ${String(exhaustive)}`);
    }
  }
}
