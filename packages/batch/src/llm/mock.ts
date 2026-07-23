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

    // RESPONSE_SCHEMA 行で出力形状を切り替える(実 LLM への JSON 指示に対応する mock 挙動)
    if (prompt.user.includes("RESPONSE_SCHEMA: daily_sections")) {
      const places = matchLine(prompt.user, "スケジュール用スポット") ?? "なし";
      const usesRealPlace = !places.startsWith("なし");
      const spot = usesRealPlace ? places.split("、")[0] : "近所のカフェ";
      const sections = {
        fortune: `【モック運勢】${date}・${typeName}のあなたへ。落ち着いて過ごすと良い一日です。`,
        schedule: `15時ごろ、${spot ?? "近所のカフェ"}でひと休みして気分を切り替えましょう。`,
        characterNote: `${charName}より一言: 今日も無理せずいきましょう。応援しています。`,
      };
      return Promise.resolve(JSON.stringify(sections));
    }

    if (prompt.user.includes("RESPONSE_SCHEMA: personality")) {
      const zodiac = matchLine(prompt.user, "星座") ?? "星座";
      const items = {
        basicNature: `【モック】${typeName}(${zodiac})の基本的な性質の説明です。`,
        workStrength: "【モック】仕事上の強みの説明です。",
        workWeakness: "【モック】仕事上の弱みの説明です。",
        socialTendency: "【モック】人付き合いの傾向の説明です。",
        goodAt: "【モック】得意なことの説明です。",
        badAt: "【モック】苦手なことの説明です。",
      };
      return Promise.resolve(JSON.stringify(items));
    }

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
