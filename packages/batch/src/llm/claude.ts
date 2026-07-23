/**
 * ClaudeProvider — Anthropic SDK 実装。
 *
 * 短い運勢文の生成用途のため thinking は無効化してコスト・レイテンシを抑える
 * (Claude Sonnet 5 は thinking: disabled を許容)。モデル名は config で差し替え可能。
 */

import Anthropic from "@anthropic-ai/sdk";
import type { LlmPrompt, LlmProvider } from "./provider.js";

export interface ClaudeProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
}

export class ClaudeProvider implements LlmProvider {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(opts: ClaudeProviderOptions) {
    if (!opts.apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY が未設定です。LLM_PROVIDER=claude では .env / Docker env でキーを注入してください",
      );
    }
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model;
    this.maxTokens = opts.maxTokens;
    this.name = `claude:${opts.model}`;
  }

  async generate(prompt: LlmPrompt): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: "disabled" },
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      throw new Error(`ClaudeProvider: 空の応答 (stop_reason=${response.stop_reason ?? "?"})`);
    }
    return text;
  }
}
