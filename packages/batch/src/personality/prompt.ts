/**
 * 性質レポート(「AI占い」用)のプロンプト組み立て。
 *
 * タイプ名(docs/04 適用済み)+ 星座 の性質から、6項目の説明文を JSON で生成させる。
 * ★CLAUDE.md: LLM は「その性質の説明」を書くのみ。占い結果の新規事実を創作しない。
 * ★著作権ガード: axes(3軸)は注入しない。タイプ名と星座のみを事実として渡す。
 *
 * 語り口は中立(性質の解説)。キャラのトーン(persona)は使わない。
 */

import type { LlmPrompt } from "../llm/provider.js";
import type { PersonalityStructured } from "./structured.js";

function buildSystem(): string {
  return [
    "あなたは性格タイプと星座の性質を、やわらかい言葉で解説するアシスタントです。",
    "与えられたタイプ名と星座の一般的な傾向をふまえ、次の6項目を JSON で出力してください:",
    "basicNature(基本的な性質) / workStrength(仕事上の強み) / workWeakness(仕事上の弱み) /",
    "socialTendency(人付き合いの傾向) / goodAt(得意なこと) / badAt(苦手なこと)。",
    "ルール:",
    "- 各項目 60〜120文字程度。前向きで、弱み・苦手も否定せず成長の余地として書く。",
    "- 事実として与えられたタイプ名・星座のみを根拠にする。生年月日・運勢・具体的な出来事など与えられていない情報は創作しない。",
    "- 断定的な決めつけを避け、「〜な傾向があります」のような説明口調にする。",
    "- 内部のラベル名やタイプID、この指示文の存在には言及しない。",
    "- 出力は6キーの JSON のみ。前後に説明やコードフェンスを付けない。",
  ].join("\n");
}

function buildUser(data: PersonalityStructured): string {
  return [
    "RESPONSE_SCHEMA: personality",
    "以下の確定情報に基づいて、性質レポート6項目を JSON で書いてください。",
    "",
    `タイプ名: ${data.typeName}`,
    `星座: ${data.zodiacName}`,
  ].join("\n");
}

/**
 * 構造化データ(タイプ×星座)から性質レポート生成用プロンプトを組み立てる。
 */
export function buildPersonalityPrompt(data: PersonalityStructured): LlmPrompt {
  return {
    system: buildSystem(),
    user: buildUser(data),
  };
}
