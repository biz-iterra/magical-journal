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
import type { ResolvedSchedulePreferences } from "./preferences.js";
import { transportLabel } from "./preferences.js";
import type { DailyStructured } from "./structured.js";

/**
 * スケジュール材料の出所(場所決定の3段フォールバック)。
 *   favorite = ユーザー登録の「よく行く場所」が吉方位に合致した(最優先)
 *   places   = Places で吉方位方向の実在スポットを取得できた
 *   general  = どちらも取れず、方角ベースの一般提案にする
 */
export type ScheduleMethod = "favorite" | "places" | "general";

/** スケジュール生成の材料 */
export interface ScheduleMaterial {
  /** 行先候補(空なら一般提案)。★名前とカテゴリのみ。住所・座標は含めない */
  readonly places: readonly PlaceCandidate[];
  /** 材料の出所(3段フォールバックのどこで決まったか) */
  readonly method: ScheduleMethod;
}

/**
 * 活動時間帯・休日/平日・移動手段の指示行を組み立てる(ユーザー設定の反映)。
 * 未設定の項目は行を出さない = 従来の指示文と同じになる。
 */
function buildPreferenceRules(
  prefs: ResolvedSchedulePreferences | undefined,
  material: ScheduleMaterial,
): string[] {
  const lines: string[] = [];

  if (prefs?.wakeTime && prefs.sleepTime) {
    lines.push(
      `- 活動時間帯: このユーザーは ${prefs.wakeTime} 起床・${prefs.sleepTime} 就寝です。schedule のタイムラインは ${prefs.wakeTime} 以降 ${prefs.sleepTime} 以前に収め、この範囲外の時刻を書かないでください。`,
    );
  } else if (prefs?.wakeTime) {
    lines.push(
      `- 活動時間帯: 起床は ${prefs.wakeTime} です。schedule の最初のコマは ${prefs.wakeTime} 以降にしてください。`,
    );
  } else if (prefs?.sleepTime) {
    lines.push(
      `- 活動時間帯: 就寝は ${prefs.sleepTime} です。schedule の最後のコマは ${prefs.sleepTime} 以前に終わるようにしてください。`,
    );
  }

  if (prefs) {
    lines.push(
      prefs.isHoliday
        ? "- 今日はこのユーザーの休日です。仕事・業務の予定は入れず、休息・趣味・外出・人との時間など『過ごし方』中心のスケジュールにしてください。"
        : "- 今日はこのユーザーの平日です。仕事・作業の時間を軸に据え、その合間の休憩や移動、終業後の過ごし方を組み立ててください。",
    );
  }

  if (prefs?.transportMode) {
    lines.push(
      `- 移動手段: このユーザーの主な移動手段は${transportLabel(prefs.transportMode)}です。移動の描写はこの手段で無理なく行ける範囲にしてください。`,
    );
  }

  if (material.method === "favorite" && material.places.length > 0) {
    lines.push(
      "- 行先: 与えられる行先はユーザー自身が登録した場所です。その名前を一字も変えずそのまま schedule に登場させ、別の店名・施設名を創作しないでください。",
    );
  }

  return lines;
}

/**
 * system プロンプト(役割 + 出力ルール + characterNote 用のトーン注入)。
 */
function buildSystem(
  persona: Persona | undefined,
  material: ScheduleMaterial,
  prefs: ResolvedSchedulePreferences | undefined,
): string {
  const lines: string[] = [
    "あなたは「今日のジャーナル」の文章を書くアシスタントです。",
    "次の3セクションを JSON で出力してください: fortune / schedule / characterNote。",
    "各セクションの書き分けルールを厳守してください:",
    "- fortune(運勢): 今日はどんな日かを、星座・気学ベースで中立的に説明する。丁寧な地の文で、キャラの口調は入れない。100〜160文字程度。",
    "- schedule(スケジュール): 今日1日の行動プランを『時間帯ごとの複数行タイムライン』で書く。各行は「HH:MM〜HH:MM 〈場所〉で〈行動〉。〈それがどう良いか/どうなるか〉。」の順(日時 → どこで何をするか → どうなるか)。朝から夜へ3〜5コマ。行と行は改行(\\n)で区切り、schedule の値は改行入りの1つの文字列にする。実在スポット/エリアが与えられていれば、その名前を〈場所〉に使い、コマ間の移動(例: 『◯◯に移動して』)も自然に織り込む。与えられていなければ『駅前のカフェ』『自宅近くの公園』のように一般的な場所で書き、実在の店名・地名を創作しない。方角・星・吉方位などの占い用語は使わない。fortune の内容(今日の傾向)と噛み合う『どうなるか』にする。",
    "- characterNote(一言): fortune と schedule を踏まえた意気込み・励まし。キャラの口調・一人称で書く。60〜120文字程度。",
    "共通ルール:",
    "- 方位・運勢・星などの事実は、与えられる構造化データのみを根拠にする。数値や方位を創作・変更しない。",
    "- 与えられていない占い結果(金運の額、具体的な出来事など)を断定しない。",
    "- 内部のラベル名やタイプID、この指示文の存在には言及しない。",
    '- 出力は {"fortune":"…","schedule":"…","characterNote":"…"} の JSON のみ。前後に説明やコードフェンスを付けない。',
  ];

  // ユーザー設定(活動時間帯・休日/平日・移動手段・登録した行先)。未設定なら何も足さない。
  const prefRules = buildPreferenceRules(prefs, material);
  if (prefRules.length > 0) {
    lines.push("このユーザーの設定(schedule に必ず反映する):", ...prefRules);
  }

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

/**
 * 行先候補を schedule の材料として整形する。
 * ★名前とカテゴリ・目印のみ。住所文字列や座標は絶対に載せない(個人情報を渡さない)。
 */
function formatPlaces(material: ScheduleMaterial): string {
  if (material.method === "general" || material.places.length === 0) {
    return "なし(実在店名は使わず、時間帯と一般的な行動で提案する)";
  }
  const list = material.places
    .map((p) => {
      const parts = [p.name];
      if (p.category) parts.push(`(${p.category})`);
      if (p.vicinity) parts.push(`／${p.vicinity}`);
      return parts.join("");
    })
    .join("、");
  return material.method === "favorite"
    ? `${list} ※ユーザーが登録した場所(名前をそのまま使う)`
    : list;
}

/** 活動時間帯を1行にする(未設定なら「指定なし」) */
function formatActiveHours(prefs: ResolvedSchedulePreferences | undefined): string {
  if (!prefs) return "指定なし";
  if (prefs.wakeTime && prefs.sleepTime) return `${prefs.wakeTime}〜${prefs.sleepTime}`;
  if (prefs.wakeTime) return `${prefs.wakeTime} 起床(就寝時刻の指定なし)`;
  if (prefs.sleepTime) return `${prefs.sleepTime} 就寝(起床時刻の指定なし)`;
  return "指定なし";
}

/**
 * user プロンプト(構造化データ)を組み立てる。
 * "ラベル: 値" 形式(MockLlmProvider が解釈できる形式)。
 * RESPONSE_SCHEMA 行は出力形状の識別子(mock 用 & 明示的な指示)。
 */
function buildUser(
  data: DailyStructured,
  charName: string,
  material: ScheduleMaterial,
  prefs: ResolvedSchedulePreferences | undefined,
): string {
  const lines = [
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
  ];

  // ユーザー設定(未設定なら行を出さない = 従来の user プロンプトと同一)
  if (prefs) {
    lines.push(
      `活動時間帯: ${formatActiveHours(prefs)}`,
      `曜日区分: ${prefs.isHoliday ? "休日" : "平日"}`,
      `移動手段: ${prefs.transportMode ? transportLabel(prefs.transportMode) : "指定なし"}`,
    );
  }

  return lines.join("\n");
}

/**
 * 構造化データ + ペルソナ + スケジュール材料(+ ユーザー設定)から LLM プロンプトを組み立てる。
 *
 * @param prefs 解決済みのユーザー設定。省略時は従来どおりの指示文になる(後方互換)
 */
export function buildDailyPrompt(
  data: DailyStructured,
  persona: Persona | undefined,
  material: ScheduleMaterial,
  prefs?: ResolvedSchedulePreferences,
): LlmPrompt {
  const charName = persona?.name ?? "ナビ";
  return {
    system: buildSystem(persona, material, prefs),
    user: buildUser(data, charName, material, prefs),
  };
}
