/**
 * OpenAiProvider — OpenAI SDK 実装(Chat Completions)。
 * モデル名は config で差し替え可能。
 */

import OpenAI from "openai";
import type { LlmPrompt, LlmProvider } from "./provider.js";

export interface OpenAiProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
}

export class OpenAiProvider implements LlmProvider {
  readonly name: string;
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(opts: OpenAiProviderOptions) {
    if (!opts.apiKey) {
      throw new Error(
        "OPENAI_API_KEY が未設定です。LLM_PROVIDER=openai では .env / Docker env でキーを注入してください",
      );
    }
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model;
    this.maxTokens = opts.maxTokens;
    this.name = `openai:${opts.model}`;
  }

  async generate(prompt: LlmPrompt): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_completion_tokens: this.maxTokens,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    });

    const text = (response.choices[0]?.message.content ?? "").trim();
    if (!text) {
      const reason = response.choices[0]?.finish_reason ?? "?";
      throw new Error(`OpenAiProvider: 空の応答 (finish_reason=${reason})`);
    }
    return text;
  }
}
