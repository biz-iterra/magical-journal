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
    // GPT-5 / o 系は推論モデル。推論トークンが max_completion_tokens を
    // 消費し、既定(medium)だと本文出力前に上限へ達して空応答になりうる。
    // 運勢文生成は深い推論を要しないため reasoning_effort=minimal で
    // 推論を最小化し、出力にトークン枠を回す(コスト・遅延も低減)。
    const isReasoningModel = /^(gpt-5|o\d)/.test(this.model);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_completion_tokens: this.maxTokens,
      ...(isReasoningModel ? { reasoning_effort: "minimal" as const } : {}),
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
