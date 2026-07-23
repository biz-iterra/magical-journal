/**
 * LLM プロバイダ抽象化(設計書§LlmProvider)。
 *
 * バッチの文章生成は Claude / GPT を設定で切り替え可能にする。決定的ロジック
 * (診断・暦・方位)は engine/暦マスタで計算し、LLM は文章生成のみを担う。
 * ユーザー操作起点のリアルタイム呼び出しはしない(バッチのみ)。
 */

/** LLM への入力。system=役割/トーン指示、user=構造化データ */
export interface LlmPrompt {
  readonly system: string;
  readonly user: string;
}

/** LLM プロバイダ共通インターフェース */
export interface LlmProvider {
  /** プロバイダ識別名(ログ用。シークレットは含めない) */
  readonly name: string;
  /** プロンプトから文章を生成して返す */
  generate(prompt: LlmPrompt): Promise<string>;
}
