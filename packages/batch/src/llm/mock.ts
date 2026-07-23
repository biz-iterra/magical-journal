/**
 * MockLlmProvider — テスト・ローカル検証用。
 *
 * 実 API を叩かず、プロンプトから決定的な文字列を返す(コスト・privacy 配慮)。
 * 同一プロンプトなら常に同一出力。プロンプト中のキャラ名などを軽く反映して
 * 「生成された感」のあるプレースホルダを返す。
 */

import type { LlmPrompt, LlmProvider } from "./provider.js";

export class MockLlmProvider implements LlmProvider {
  readonly name = "mock";

  generate(prompt: LlmPrompt): Promise<string> {
    // user プロンプトから「タイプ名: ...」「日付: ...」行を軽く拾って埋め込む
    const typeName = matchLine(prompt.user, "タイプ名") ?? "あなた";
    const date = matchLine(prompt.user, "日付") ?? "本日";
    const charName = matchLine(prompt.user, "キャラ名") ?? "ナビ";

    const text = `【モック運勢】${date}・${typeName}のあなたへ。${charName}がお届けする今日のひとこと。構造化データに基づく決定的な方位・運勢はコードで算出済みです。この文章は MockLlmProvider による決定的なプレースホルダです。`;
    return Promise.resolve(text);
  }
}

/** "ラベル: 値" 形式の行から値を取り出す(最初の一致) */
function matchLine(text: string, label: string): string | undefined {
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0 && line.slice(0, idx).trim() === label) {
      const value = line.slice(idx + 1).trim();
      if (value) return value;
    }
  }
  return undefined;
}
