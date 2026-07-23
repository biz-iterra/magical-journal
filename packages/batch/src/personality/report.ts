/**
 * 性質レポートの6項目の型と、LLM 出力(JSON)のパース、保存用 report_json の組み立て。
 *
 * 6項目: ①基本的な性質 ②仕事上の強み ③仕事上の弱み ④人付き合いの傾向 ⑤得意なこと ⑥苦手なこと
 */

import type { PersonalityStructured } from "./structured.js";

/** 性質レポートの6項目 */
export interface PersonalityItems {
  /** ①基本的な性質 */
  readonly basicNature: string;
  /** ②仕事上の強み */
  readonly workStrength: string;
  /** ③仕事上の弱み */
  readonly workWeakness: string;
  /** ④人付き合いの傾向 */
  readonly socialTendency: string;
  /** ⑤得意なこと */
  readonly goodAt: string;
  /** ⑥苦手なこと */
  readonly badAt: string;
}

/**
 * DB(personality_reports.report_json)と API 応答(report)に載せる形。
 * 生成根拠(potentialType/zodiac)を含めることで再生成要否を判定できる。
 * ★axes は含めない。
 */
export interface PersonalityReport {
  readonly potentialType: string;
  readonly typeName: string;
  readonly zodiac: string;
  readonly zodiacName: string;
  readonly items: PersonalityItems;
}

/** LLM 出力から最初の {...} JSON を取り出す(コードフェンス・前後説明に耐性) */
function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? trimmed;
  const start = body.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i += 1) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(body.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * LLM 出力を6項目にパースする。全項目が空(=構造化失敗)なら null。
 */
export function parsePersonalityItems(raw: string): PersonalityItems | null {
  const obj = extractJsonObject(raw);
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const items: PersonalityItems = {
    basicNature: asString(o.basicNature),
    workStrength: asString(o.workStrength),
    workWeakness: asString(o.workWeakness),
    socialTendency: asString(o.socialTendency),
    goodAt: asString(o.goodAt),
    badAt: asString(o.badAt),
  };
  const hasAny = Object.values(items).some((v) => v.length > 0);
  return hasAny ? items : null;
}

/** 構造化データ + 6項目から保存用レポートを組み立てる */
export function buildReport(
  structured: PersonalityStructured,
  items: PersonalityItems,
): PersonalityReport {
  return {
    potentialType: structured.potentialType,
    typeName: structured.typeName,
    zodiac: structured.zodiac,
    zodiacName: structured.zodiacName,
    items,
  };
}
