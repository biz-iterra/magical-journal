/**
 * 事前生成済みの性質レポート(静的配信)の取得。
 *
 * 性質レポートはタイプ × 星座だけで決まる(12 × 12 = 144 通り)。その 144 通りを
 * あらかじめ生成して `/personality/<slug>.json` として配信しているため、友達診断は
 * 「該当ファイルを読むだけ」で AI 占いを表示できる。
 *
 * ★CLAUDE.md ルール5(第三者情報を預からない): 友達の生年月日などの入力値は
 *   サーバーへ送らない。この取得は認証不要の静的ファイル GET で、body も
 *   クエリ文字列も持たない(URL に載るのは診断済みのタイプと星座の slug だけで、
 *   キャラ画像の読み込みと同じ粒度)。apiClient(認証付き)は使わない。
 *
 * 未生成(まだ 144 通りを生成していない / 生成に失敗した)場合は null を返し、
 * 画面は「準備中」を表示する。エラーで画面を壊さない。
 */

import type { PotentialTypeId, ZodiacSign } from "@mj/engine";
import { personalityStaticPath } from "@mj/engine";
import type { PersonalityReport } from "./personality";

/** 6項目のキー(この6つが揃っていなければ壊れたファイルとして扱う) */
const ITEM_KEYS = [
  "basicNature",
  "workStrength",
  "workWeakness",
  "socialTendency",
  "goodAt",
  "badAt",
] as const;

/**
 * 取得した JSON が期待の形かを検証する。
 * SPA フォールバックで HTML や別の JSON が返ってきた場合に取り違えないためのガード。
 */
function isPersonalityReport(data: unknown): data is PersonalityReport {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  if (typeof o.typeName !== "string" || typeof o.zodiacName !== "string") return false;
  const items = o.items;
  if (typeof items !== "object" || items === null) return false;
  const i = items as Record<string, unknown>;
  return ITEM_KEYS.some((k) => typeof i[k] === "string" && i[k] !== "");
}

/**
 * タイプ × 星座の静的レポートを取得する。
 * 未生成・見つからない・壊れている場合は null(=「準備中」)。
 *
 * @throws ネットワーク到達不能などの通信エラー(呼び出し側で再試行を促す)
 */
export async function fetchStaticPersonality(
  potentialType: PotentialTypeId,
  zodiac: ZodiacSign,
): Promise<PersonalityReport | null> {
  const res = await fetch(personalityStaticPath(potentialType, zodiac), {
    headers: { Accept: "application/json" },
  });
  // 404(未生成)はエラーにしない。「準備中」として扱う。
  if (!res.ok) return null;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    // 静的ホスティングのフォールバックで HTML が返るケースなど
    return null;
  }
  return isPersonalityReport(data) ? data : null;
}
