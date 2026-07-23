/**
 * 性質レポート生成バッチ(「AI占い」用の事前生成)。
 *
 * タイプ×星座で固定なので 1 ユーザー 1 回生成すれば十分(冪等)。夜間バッチに相乗り
 * するか、専用サブコマンド run-personality で実行する。
 *
 *   1. アクティブユーザーを取得
 *   2. ユーザーごとにタイプ×星座の構造化データを算出(engine = 決定的)
 *   3. 既存レポートの署名(タイプ×星座)が一致すればスキップ(タイプが変わらない限り再生成しない)
 *   4. LLM で6項目を JSON 生成 → パース(失敗はそのユーザーを失敗扱いにして続行、保存しない)
 *   5. personality_reports に upsert(report_json)
 *
 * CLAUDE.md ルール6: リアルタイム LLM 呼び出しをしない(押下時生成は不可)。ここで事前生成する。
 * 失敗ユーザーはスキップして続行し、失敗一覧をログに残す。個人情報はログに出さない(user_id のみ)。
 */

import type { ActiveUser } from "../daily/run.js";
import type { LlmProvider } from "../llm/provider.js";
import { buildPersonalityPrompt } from "./prompt.js";
import type { PersonalityReport } from "./report.js";
import { buildReport, parsePersonalityItems } from "./report.js";
import { buildPersonalityStructured, signatureOf } from "./structured.js";

/** 最小ロガー(差し替え可能) */
export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

const defaultLogger: Logger = {
  info: (m) => console.log(m),
  error: (m) => console.error(m),
};

export interface RunPersonalityDeps {
  readonly provider: LlmProvider;
  /** ユーザー取得(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly getUsers: () => ActiveUser[];
  /** 既存レポートの report_json を返す(冪等性の署名比較用)。無ければ null */
  readonly getExistingReport: (userId: number) => string | null;
  /** 保存(index.ts が DB 実装を注入) */
  readonly saveReport: (userId: number, reportJson: string) => void;
  /** true なら署名が同じでも再生成する(既定 false) */
  readonly force?: boolean;
  readonly logger?: Logger;
}

export interface RunPersonalityFailure {
  readonly userId: number;
  readonly error: string;
}

export interface RunPersonalityResult {
  readonly total: number;
  readonly succeeded: number;
  /** 既存レポートが最新(署名一致)でスキップした件数 */
  readonly skipped: number;
  readonly failed: readonly RunPersonalityFailure[];
}

/** 既存 report_json から署名(タイプ×星座)を取り出す。壊れていれば null */
function existingSignature(reportJson: string | null): string | null {
  if (!reportJson) return null;
  try {
    const o = JSON.parse(reportJson) as { potentialType?: unknown; zodiac?: unknown };
    if (typeof o.potentialType === "string" && typeof o.zodiac === "string") {
      return `${o.potentialType}:${o.zodiac}`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * 1 ユーザー分の性質生成に必要な依存(DB を含めない)。
 * runPersonalityBatch と API(登録時の非同期生成・手動再生成)の両方から使う共有ロジック。
 */
export interface GeneratePersonalityDeps {
  readonly provider: LlmProvider;
  readonly logger?: Logger;
}

/**
 * 1 ユーザー分の性質レポート(6項目 + 生成根拠)を生成して返す。
 *
 *   1. 構造化データ(決定的: タイプ×星座)
 *   2. LLM で6項目 JSON 生成 → パース(失敗は throw)
 *
 * ★DB 保存はしない(呼び出し側が saveReport 相当で保存する)。
 * ★署名スキップ判定(冪等)はしない。それは呼び出し側(バッチ)の責務。
 * パース失敗は throw する(呼び出し側でスキップ/エラー判断)。
 */
export async function generatePersonalityForUser(
  user: ActiveUser,
  deps: GeneratePersonalityDeps,
): Promise<PersonalityReport> {
  const structured = buildPersonalityStructured({
    birthDate: user.birthDate,
    birthTime: user.birthTime,
  });
  const prompt = buildPersonalityPrompt(structured);
  const raw = await deps.provider.generate(prompt);
  const items = parsePersonalityItems(raw);
  if (!items) {
    throw new Error("性質レポートの JSON パースに失敗しました");
  }
  return buildReport(structured, items);
}

/**
 * 性質レポート生成バッチを実行する(1 回実行)。
 */
export async function runPersonalityBatch(deps: RunPersonalityDeps): Promise<RunPersonalityResult> {
  const logger = deps.logger ?? defaultLogger;
  const { getUsers, getExistingReport, saveReport } = deps;
  const force = deps.force ?? false;

  const users = getUsers();
  logger.info(
    `[personality] provider=${deps.provider.name} users=${String(users.length)}${force ? " force" : ""} 開始`,
  );

  const failed: RunPersonalityFailure[] = [];
  let succeeded = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      // 2. 構造化データ(決定的)
      const structured = buildPersonalityStructured({
        birthDate: user.birthDate,
        birthTime: user.birthTime,
      });
      const sig = signatureOf(structured);

      // 3. 冪等性: 署名が一致すればスキップ(タイプ×星座が不変なら LLM を呼ばない)
      if (!force && existingSignature(getExistingReport(user.userId)) === sig) {
        skipped += 1;
        continue;
      }

      // 4. 生成(6項目 JSON。API と共有する純関数。パース失敗は throw)
      const report = await generatePersonalityForUser(user, {
        provider: deps.provider,
        logger,
      });

      // 5. 保存
      saveReport(user.userId, JSON.stringify(report));
      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ userId: user.userId, error: message });
      logger.error(`[personality] user_id=${String(user.userId)} 失敗: ${message}`);
    }
  }

  const result: RunPersonalityResult = {
    total: users.length,
    succeeded,
    skipped,
    failed,
  };
  logger.info(
    `[personality] 完了 total=${String(result.total)} ok=${String(succeeded)} skip=${String(skipped)} ng=${String(failed.length)}`,
  );
  return result;
}
