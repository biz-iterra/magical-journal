/**
 * LINE 応答メッセージ(Flex カード・テキスト)の組み立て。
 *
 * すべて事前生成データ・固定コピーのみを使う純関数(CLAUDE.md ルール6:
 * リアルタイム LLM 呼び出しをしない)。タイプ表示文言は engine の typeName
 * (docs/04 適用済み)を正とする(ルール7)。
 *
 * ★著作権/privacy ガード: カードには 3軸(axes)・氏名・住所・緯度経度など
 * 内部情報や個人特定情報を含めない。確定情報(タイプ名・星座・本命星・運勢文)
 * のみを載せる。
 */

import type { PotentialTypeId } from "@mj/engine";
import { getCharacter, getCharacterName } from "@mj/engine";
import type { LineMessage } from "./client.js";

/** Flex カードの URL 生成に必要な設定(env 由来) */
export interface LineConfig {
  /** LIFF ID(空ならディープリンクのボタンを省略) */
  readonly liffId: string;
  /** キャラ画像の公開ベース URL・末尾スラッシュなし(空なら画像を省略) */
  readonly publicAssetBaseUrl: string;
}

/** char_style */
export type CharStyle = "male" | "female";

// ── 固定コピー用の確定情報マップ ────────────────────────────
// 星座・本命星は確定情報。表示名の固定コピー(LLM 不使用)。

const ZODIAC_JA: Readonly<Record<string, string>> = {
  aries: "牡羊座",
  taurus: "牡牛座",
  gemini: "双子座",
  cancer: "蟹座",
  leo: "獅子座",
  virgo: "乙女座",
  libra: "天秤座",
  scorpio: "蠍座",
  sagittarius: "射手座",
  capricorn: "山羊座",
  aquarius: "水瓶座",
  pisces: "魚座",
};

const STAR_NAMES: Readonly<Record<number, string>> = {
  1: "一白水星",
  2: "二黒土星",
  3: "三碧木星",
  4: "四緑木星",
  5: "五黄土星",
  6: "六白金星",
  7: "七赤金星",
  8: "八白土星",
  9: "九紫火星",
};

// ── URL ヘルパー ────────────────────────────────────────────

/**
 * キャラ画像の絶対 URL を返す。ベース URL 未設定なら null(画像省略)。
 * liff の characterImagePath と同じ規則: {base}/characters/NN-name/{style}.webp
 */
export function characterImageUrl(
  config: LineConfig,
  typeId: PotentialTypeId,
  style: CharStyle,
): string | null {
  if (!config.publicAssetBaseUrl) return null;
  const dirKey = getCharacter(typeId).directoryKey.replace(/\/$/, "");
  return `${config.publicAssetBaseUrl}/${dirKey}/${style}.webp`;
}

/**
 * LIFF ディープリンクを返す。LIFF ID 未設定なら null(ボタン省略)。
 * 例: liffDeepLink(cfg, "/mytype") -> https://liff.line.me/{id}/mytype
 */
export function liffDeepLink(config: LineConfig, path: string): string | null {
  if (!config.liffId) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://liff.line.me/${config.liffId}${p}`;
}

// ── テキスト整形 ────────────────────────────────────────────

/** 運勢文を要約(先頭 max 文字。超過時は末尾を … に)。 */
export function summarize(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

// ── マイタイプカード ────────────────────────────────────────

export interface MyTypeCardInput {
  readonly typeId: PotentialTypeId;
  readonly charStyle: CharStyle;
  /** 星座 ID(zodiac モジュール結果。無ければ省略) */
  readonly zodiacSign?: string;
  /** 本命星(kigaku_profile 結果。無ければ省略) */
  readonly honmeiStar?: number;
}

/**
 * マイタイプの Flex カードを組み立てる。
 * キャラ画像 + タイプ名 + キャラ名 + 星座/本命星(固定コピー)+「詳しく見る」ボタン。
 */
export function buildMyTypeCard(config: LineConfig, input: MyTypeCardInput): LineMessage {
  const char = getCharacter(input.typeId);
  const charName = getCharacterName(input.typeId, input.charStyle);
  const imageUrl = characterImageUrl(config, input.typeId, input.charStyle);
  const link = liffDeepLink(config, "/mytype");

  const bodyContents: unknown[] = [
    { type: "text", text: "あなたのタイプ", size: "sm", color: "#8b7fd6", weight: "bold" },
    { type: "text", text: char.typeName, size: "xl", weight: "bold", wrap: true },
    { type: "text", text: charName, size: "md", color: "#555555", margin: "sm" },
  ];

  // 星座・本命星の確定情報(固定コピー)
  const facts: string[] = [];
  const zodiacJa = input.zodiacSign ? ZODIAC_JA[input.zodiacSign] : undefined;
  if (zodiacJa) facts.push(zodiacJa);
  const starName = input.honmeiStar != null ? STAR_NAMES[input.honmeiStar] : undefined;
  if (starName) facts.push(starName);
  if (facts.length > 0) {
    bodyContents.push({
      type: "text",
      text: facts.join("  /  "),
      size: "sm",
      color: "#888888",
      margin: "md",
      wrap: true,
    });
  }

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: { type: "box", layout: "vertical", contents: bodyContents },
  };

  if (imageUrl) {
    bubble.hero = {
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: "1:1",
      aspectMode: "cover",
    };
  }

  if (link) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#8b7fd6",
          action: { type: "uri", label: "詳しく見る", uri: link },
        },
      ],
    };
  }

  return { type: "flex", altText: `マイタイプ: ${char.typeName}`, contents: bubble };
}

// ── 運勢カード ──────────────────────────────────────────────

export interface FortuneCardInput {
  readonly date: string; // "YYYY-MM-DD"
  /** 事前生成済みの運勢文。null/未生成なら「準備中」表示 */
  readonly fortuneText: string | null;
}

/**
 * 今日の運勢の Flex カードを組み立てる。
 * daily_fortunes(夜間バッチ事前生成)の運勢文を要約して載せ、
 * 「今日のジャーナルを開く」ボタンで今日のページ LIFF(/)へ。
 * 未生成なら「まだ準備中」の旨を表示する(リアルタイム生成はしない)。
 */
export function buildFortuneCard(config: LineConfig, input: FortuneCardInput): LineMessage {
  const link = liffDeepLink(config, "/");
  const ready = input.fortuneText != null && input.fortuneText.trim().length > 0;

  const bodyText = ready
    ? summarize(input.fortuneText as string)
    : "本日の運勢はまだ準備中です。しばらくたってからご確認ください。";

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "今日の運勢", size: "sm", color: "#8b7fd6", weight: "bold" },
        { type: "text", text: input.date, size: "xs", color: "#aaaaaa", margin: "sm" },
        { type: "text", text: bodyText, size: "md", wrap: true, margin: "md" },
      ],
    },
  };

  if (link) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#8b7fd6",
          action: { type: "uri", label: "今日のジャーナルを開く", uri: link },
        },
      ],
    };
  }

  return { type: "flex", altText: `今日の運勢(${input.date})`, contents: bubble };
}

// ── テキスト応答 ────────────────────────────────────────────

/**
 * 未登録ユーザーへの案内。登録用 LIFF リンク(ルート = 登録画面へ誘導)を添える。
 */
export function buildRegisterPrompt(config: LineConfig): LineMessage {
  const link = liffDeepLink(config, "/");
  const base = "はじめまして。マジカルジャーナルを使うには、まず登録が必要です。";
  const text = link
    ? `${base}\n\n▼ こちらから登録\n${link}`
    : `${base}\nメニューの「今日のジャーナル」から登録してください。`;
  return { type: "text", text };
}

/**
 * どのキーワードにも一致しないテキストへのヘルプ(使えるキーワード案内)。
 */
export function buildHelp(): LineMessage {
  return {
    type: "text",
    text: [
      "次のキーワードを送るとお応えします。",
      "・「マイタイプ」— あなたのタイプカード",
      "・「今日の運勢」— 今日の運勢カード",
      "そのほかはメニューから各ページを開いてください。",
    ].join("\n"),
  };
}
