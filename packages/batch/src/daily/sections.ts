/**
 * 「今日のジャーナル」3セクションの型と、LLM 出力(JSON)のパース/フォールバック。
 *
 * セクション:
 *  1. fortune       運勢(中立的な地の文。キャラのトーンは入れない)
 *  2. schedule      スケジュール(時間帯 + 具体的な行動提案。気学用語は使わない)
 *  3. characterNote {キャラ名}からの一言(キャラのトーンで書く)
 *
 * LLM には JSON 構造化出力を返させ、ここでパースする。パース失敗時はフォールバック
 * (全体を characterNote に入れ、fortune は原文/空でも機能は止めない)。
 */

/** 3セクション */
export interface DailySections {
  readonly fortune: string;
  readonly schedule: string;
  readonly characterNote: string;
}

/**
 * LLM の生出力から JSON を取り出す。コードフェンス(```json …```)や前後の
 * 説明文が混じっていても最初の {...} ブロックを拾う。取り出せなければ null。
 */
function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  // ```json ... ``` フェンスを除去
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? trimmed;

  // 最初の { から対応する } までを素朴に走査(文字列内の波括弧も考慮)
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
        const slice = body.slice(start, i + 1);
        try {
          return JSON.parse(slice);
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
 * LLM 出力を 3セクションにパースする。
 * パース不能・全項目空のときは、原文を characterNote に入れてフォールバックする
 * (機能は止めない。呼び出し側で失敗ログを残す判断ができるよう parsed フラグを返す)。
 */
export function parseDailySections(raw: string): { sections: DailySections; parsed: boolean } {
  const obj = extractJsonObject(raw);
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const fortune = asString(o.fortune);
    const schedule = asString(o.schedule);
    const characterNote = asString(o.characterNote);
    if (fortune || schedule || characterNote) {
      return { sections: { fortune, schedule, characterNote }, parsed: true };
    }
  }
  // フォールバック: 構造化できなかった生出力は一言(characterNote)として残す
  const fallback = raw.trim();
  return {
    sections: { fortune: "", schedule: "", characterNote: fallback },
    parsed: false,
  };
}
