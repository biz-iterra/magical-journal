/**
 * リクエストトリガーの文章生成で使う LLM / Places プロバイダの遅延構築。
 *
 * 生成本体(1ユーザー分の純関数)は @mj/batch に集約し、API はそれを呼ぶだけにする
 * (ロジックの重複を作らない)。ここではプロバイダと config を組み立てる。
 *
 * ★シークレットは env(+ Docker env)経由のみ(config.ts が process.env から読む)。
 *   コード・ログに含めない。
 * ★プロバイダ構築はキー未設定などで throw しうる。呼び出し側(ルート)は必ず try/catch で
 *   囲み、失敗時は握りつぶさずログを残しつつグレースフルに続行する
 *   (読み取り専用リクエストや通常の read を 500 にしない)。
 */

import {
  type BatchConfig,
  type LlmProvider,
  type PlacesProvider,
  createLlmProvider,
  createPlacesProvider,
  getConfig,
} from "@mj/batch";

export interface GenerationProviders {
  readonly config: BatchConfig;
  readonly provider: LlmProvider;
  readonly places: PlacesProvider;
}

/**
 * config を読み、LLM / Places プロバイダを構築して返す。
 * キー未設定・種別不正などで throw しうる(呼び出し側で try/catch)。
 */
export function buildGenerationProviders(): GenerationProviders {
  const config = getConfig();
  const provider = createLlmProvider(config);
  const places = createPlacesProvider(config);
  return { config, provider, places };
}
