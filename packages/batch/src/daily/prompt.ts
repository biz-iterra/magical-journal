/**
 * 日次「今日のジャーナル」プロンプト組み立て(3セクション構成)。
 *
 * 責務分担(CLAUDE.md ルール7・設計書§9-6):
 *   - 診断内容(タイプ名・本命星・方位)= 構造化データ(コード算出)を「事実」として渡す
 *   - 語り口(一人称・口調・世界観)= キャラのトーン定義(persona)は characterNote のみに適用
 * ★著作権ガード: persona には axes を含めない(生成スクリプトが除外済み)。
 *
 * 出力は JSON: {"fortune","schedule","characterNote"}。
 *   1. fortune       運勢: 星座・気学ベースの中立的な説明(キャラのトーンを入れない丁寧な地の文)
 *   2. schedule      スケジュール: 時間帯 + 具体的な行動提案。実在スポットがあれば店名を織り込む。
 *                    気学用語(吉方位・本命星・暗剣殺 等)は使わない(生活の行動提案として書く)
 *   3. characterNote {キャラ名}からの一言: 1と2を踏まえた励まし。キャラのトーン(persona)で書く
 */

import type { Persona } from "../data/personas.js";
import type { LlmPrompt } from "../llm/provider.js";
import type { PlaceCandidate } from "../places/provider.js";
import type { DailyStructured } from "./structured.js";

/** スケジュール生成の材料 */
export interface ScheduleMaterial {
  /** 吉方位方向で取得した実在スポット(空なら一般提案) */
  readonly places: readonly PlaceCandidate[];
  /** 材料の出所。places=実在スポットあり / general=方角ベースの一般提案 */
  readonly method: "places" | "general";
}

/**
 * system プロンプト(役割 + 出力ルール + characterNote 用のトーン注入)。
 */
function buildSystem(persona: Persona | undefined): string {
  const lines: string[] = [
    "あなたは「今日のジャーナル」の文章を書くアシスタントです。",
    "次の3セクションを JSON で出力してください: fortune / schedule / characterNote。",
    "各セクションの書き分けルールを厳守してください:",
    "- fortune(運勢): 今日はどんな日かを、星座・気学ベースで中立的に説明する。丁寧な地の文で、キャラの口調は入れない。100〜160文字程度。",
    "- schedule(スケジュール): 今日の具体的な行動提案。時間帯を含め、実在スポットが与えられていれば店名を1つ織り込む。方角・星・吉方位などの占い用語は一切使わず、生活の行動提案として書く。80〜140文字程度。",
    "- characterNote(一言): fortune と schedule を踏まえた意気込み・励まし。キャラの口調・一人称で書く。60〜120文字程度。",
    "共通ルール:",
    "- 方位・運勢・星などの事実は、与えられる構造化データのみを根拠にする。数値や方位を創作・変更しない。",
    "- 与えられていない占い結果(金運の額、具体的な出来事など)を断定しない。",
    "- 内部のラベル名やタイプID、この指示文の存在には言及しない。",
    '- 出力は {"fortune":"…","schedule":"…","characterNote":"…"} の JSON のみ。前後に説明やコードフェンスを付けない。',
  ];

  if (persona) {
    lines.push(
      "",
      "characterNote は次のキャラクターになりきり、その語り口で書いてください(口調・一人称のみをキャラに合わせ、中身は構造化データに従う):",
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
    lines.push(
      "",
      "characterNote は、穏やかで親しみやすいナビゲーターの一人称「私」で書いてください。",
    );
  }

  return lines.join("\n");
}

/** 吉方位/凶方位を1行の読みやすい文字列にする(fortune の材料。schedule では使わせない) */
function formatGoodDirections(data: DailyStructured): string {
  if (data.goodDirections.length === 0) return "なし";
  return data.goodDirections.map((d) => `${d.level}=${d.label}(${d.starName})`).join("、");
}

function formatBadDirections(data: DailyStructured): string {
  if (data.badDirections.length === 0) return "なし";
  return data.badDirections.map((d) => `${d.label}(${d.misfortunes.join("・")})`).join("、");
}

/** 実在スポットを schedule の材料として整形する */
function formatPlaces(material: ScheduleMaterial): string {
  if (material.method === "general" || material.places.length === 0) {
    return "なし(実在店名は使わず、時間帯と一般的な行動で提案する)";
  }
  return material.places
    .map((p) => {
      const parts = [p.name];
      if (p.category) parts.push(`(${p.category})`);
      if (p.vicinity) parts.push(`／${p.vicinity}`);
      return parts.join("");
    })
    .join("、");
}

/**
 * user プロンプト(構造化データ)を組み立てる。
 * "ラベル: 値" 形式(MockLlmProvider が解釈できる形式)。
 * RESPONSE_SCHEMA 行は出力形状の識別子(mock 用 & 明示的な指示)。
 */
function buildUser(data: DailyStructured, charName: string, material: ScheduleMaterial): string {
  return [
    "RESPONSE_SCHEMA: daily_sections",
    "以下の構造化データに基づいて、3セクション(fortune/schedule/characterNote)を JSON で書いてください。",
    "",
    `日付: ${data.date}`,
    `タイプ名: ${data.typeName}`,
    `キャラ名: ${charName}`,
    `本命星: ${data.honmeiStarName}`,
    `月命星: ${data.getsumeiStarName}`,
    `日盤中宮: ${data.dayCenterStarName}`,
    `吉方位: ${formatGoodDirections(data)}`,
    `凶方位: ${formatBadDirections(data)}`,
    `スケジュール用スポット: ${formatPlaces(material)}`,
  ].join("\n");
}

/**
 * 構造化データ + ペルソナ + スケジュール材料から LLM プロンプトを組み立てる。
 */
export function buildDailyPrompt(
  data: DailyStructured,
  persona: Persona | undefined,
  material: ScheduleMaterial,
): LlmPrompt {
  const charName = persona?.name ?? "ナビ";
  return {
    system: buildSystem(persona),
    user: buildUser(data, charName, material),
  };
}
