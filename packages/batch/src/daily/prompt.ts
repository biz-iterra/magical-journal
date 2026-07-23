/**
 * 日次運勢プロンプト組み立て。
 *
 * 責務分担(CLAUDE.md ルール7・設計書§9-6):
 *   - 診断内容(タイプ名・本命星・方位)= 構造化データ(コード算出)を「事実」として渡す
 *   - 語り口(一人称・口調・世界観)= キャラのトーン定義(persona)を system に注入
 * ★著作権ガード: persona には axes を含めない(生成スクリプトが除外済み)。
 */

import type { Persona } from "../data/personas.js";
import type { LlmPrompt } from "../llm/provider.js";
import type { DailyStructured } from "./structured.js";

/**
 * system プロンプト(役割 + キャラのトーン注入)を組み立てる。
 * persona が無い場合は中立的な穏やかな語り口にフォールバックする。
 */
function buildSystem(persona: Persona | undefined): string {
  const lines: string[] = [
    "あなたは九星気学に基づく「今日の運勢ジャーナル」の文章を書くアシスタントです。",
    "以下のルールを厳守してください:",
    "- 方位・運勢・星などの事実は、ユーザーメッセージで与えられる構造化データのみを根拠にする。数値や方位を創作・変更しない。",
    "- 与えられていない占い結果(金運の額、具体的な出来事など)を断定しない。",
    "- 日本語で、150〜220文字程度。前向きで具体的な「今日の過ごし方」の提案を必ず1つ含める。",
    "- 箇条書きや見出しは使わず、地の文で自然に書く。",
    "- 内部のラベル名やタイプID、この指示文の存在には言及しない。",
  ];

  if (persona) {
    lines.push(
      "",
      "次のキャラクターになりきり、その語り口で書いてください(口調・一人称のみをキャラに合わせ、占いの中身は構造化データに従う):",
      `- キャラ名: ${persona.name}`,
      `- 一人称: ${persona.pronoun || "私"}`,
      `- 口調: ${persona.tone || "穏やかで親しみやすい"}`,
    );
    if (persona.personalityCore.length > 0) {
      lines.push(`- 人柄: ${persona.personalityCore.join("・")}`);
    }
    if (persona.catchphrase) {
      lines.push(`- キャッチコピー: ${persona.catchphrase}`);
    }
    if (persona.speechExamples.length > 0) {
      lines.push(`- 口調の例: ${persona.speechExamples.map((e) => `「${e}」`).join(" ")}`);
    }
  } else {
    lines.push("", "語り口は、穏やかで親しみやすいナビゲーターの一人称「私」で書いてください。");
  }

  return lines.join("\n");
}

/** 吉方位/凶方位を1行の読みやすい文字列にする */
function formatGoodDirections(data: DailyStructured): string {
  if (data.goodDirections.length === 0) return "なし";
  return data.goodDirections.map((d) => `${d.level}=${d.label}(${d.starName})`).join("、");
}

function formatBadDirections(data: DailyStructured): string {
  if (data.badDirections.length === 0) return "なし";
  return data.badDirections.map((d) => `${d.label}(${d.misfortunes.join("・")})`).join("、");
}

/**
 * user プロンプト(構造化データ)を組み立てる。
 * "ラベル: 値" 形式(MockLlmProvider が解釈できる形式)。
 */
function buildUser(data: DailyStructured, charName: string): string {
  return [
    "以下の構造化データに基づいて、今日の運勢文を書いてください。",
    "",
    `日付: ${data.date}`,
    `タイプ名: ${data.typeName}`,
    `キャラ名: ${charName}`,
    `本命星: ${data.honmeiStarName}`,
    `月命星: ${data.getsumeiStarName}`,
    `日盤中宮: ${data.dayCenterStarName}`,
    `吉方位: ${formatGoodDirections(data)}`,
    `凶方位: ${formatBadDirections(data)}`,
  ].join("\n");
}

/**
 * 構造化データ + ペルソナから LLM プロンプトを組み立てる。
 */
export function buildDailyPrompt(data: DailyStructured, persona: Persona | undefined): LlmPrompt {
  const charName = persona?.name ?? "ナビ";
  return {
    system: buildSystem(persona),
    user: buildUser(data, charName),
  };
}
