/**
 * 性質レポート(マイタイプの「AI占い」)の取得・再生成。
 *
 * API サーバー(/api/personality)経由で、登録時に事前生成済みのレポートを取得し、
 * 品質テスト用の再生成(POST /api/personality/regenerate)を叩く。
 * fetch ラッパ・認証トークン付与・エラーコード整形はすべて api/client に委譲する
 * (新規に別方式の fetch を作らない)。エラーは「メッセージ(コード)」形式で表示される。
 */

import { apiClient } from "../api/client";

/** 性質レポートの6項目(@mj/batch PersonalityItems と同形状) */
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
 * 性質レポート(@mj/batch PersonalityReport と同形状)。
 * potentialType は内部用。表示は typeName / zodiacName を使う(axes は含まれない)。
 */
export interface PersonalityReport {
  readonly potentialType: string;
  readonly typeName: string;
  readonly zodiac: string;
  readonly zodiacName: string;
  readonly items: PersonalityItems;
}

interface PersonalityResponse {
  /** 未生成(登録直後の生成が未完 or 失敗)なら null */
  readonly report: PersonalityReport | null;
}

/**
 * 保存済みの性質レポートを取得する。
 * 未生成の場合は report=null(UI は「準備中」を表示)。
 */
export async function getPersonality(): Promise<PersonalityReport | null> {
  const res = await apiClient.get<PersonalityResponse>("/api/personality");
  return res.report;
}

/**
 * 性質レポートを手動で再生成する(品質テスト用)。ボディ不要。
 * レート制限超過時は 429 + MJ-PERS-429 が ApiError として throw される
 * (呼び出し側で「メッセージ(コード)」形式のまま表示する)。
 */
export async function regeneratePersonality(): Promise<PersonalityReport | null> {
  const res = await apiClient.post<PersonalityResponse>("/api/personality/regenerate");
  return res.report;
}
