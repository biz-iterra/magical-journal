/**
 * 性質レポート(AI占い)144 通りの事前生成ロジック。
 *
 * 性質レポートはタイプ × 星座だけで決まる(12 × 12 = 144 通り)。個人ごとに異なる
 * 内容ではないため、あらかじめ全通りを生成して静的 JSON として配信する。友達診断は
 * その静的ファイルを読むだけになり、友達の生年月日をサーバーへ送らずに済む
 * (CLAUDE.md ルール5「第三者情報を預からない」)。
 *
 * ここは fs / CLI 引数に触れない純ロジック(読み書きは呼び出し側が注入する)。
 * 実行用の CLI は static-generate.ts。
 *
 * 生成物の形は API(GET /api/personality)が返す PersonalityReport と同一。
 * プロンプト・パース・レポート組み立ては本人向けと同じものを再利用する
 * (prompt.ts / report.ts。新しいプロンプトを作らない)。
 */

import type { PotentialTypeId, ZodiacSign } from "@mj/engine";
import { POTENTIAL_TYPE_IDS, ZODIAC_SIGNS, personalityStaticFileName } from "@mj/engine";
import type { LlmProvider } from "../llm/provider.js";
import { buildPersonalityPrompt } from "./prompt.js";
import type { PersonalityReport } from "./report.js";
import { buildReport, parsePersonalityItems } from "./report.js";
import type { Logger } from "./run.js";
import { personalityStructuredOf } from "./structured.js";

/** 生成対象 1 件(タイプ × 星座) */
export interface PersonalityStaticTarget {
  readonly potentialType: PotentialTypeId;
  readonly zodiac: ZodiacSign;
  /** 出力ファイル名(例: "er-plus-aries.json") */
  readonly fileName: string;
}

/**
 * 12 タイプ × 12 星座 = 144 通りを列挙する。
 * タイプ・星座の一覧はどちらも engine の公開 API から取る(独自の一覧を持たない)。
 */
export function listPersonalityStaticTargets(): readonly PersonalityStaticTarget[] {
  const targets: PersonalityStaticTarget[] = [];
  for (const potentialType of POTENTIAL_TYPE_IDS) {
    for (const zodiac of ZODIAC_SIGNS) {
      targets.push({
        potentialType,
        zodiac,
        fileName: personalityStaticFileName(potentialType, zodiac),
      });
    }
  }
  return targets;
}

/** 1 件分の失敗記録(握りつぶさず一覧をログに残す) */
export interface PersonalityStaticFailure {
  readonly fileName: string;
  readonly error: string;
}

export interface PersonalityStaticResult {
  /** 全組み合わせ数(常に 144) */
  readonly total: number;
  /** 今回の処理対象(--limit 適用後) */
  readonly targeted: number;
  /** 生成して書き出した件数(dry-run では 0) */
  readonly generated: number;
  /** 生成予定(dry-run で書き出しをスキップした件数) */
  readonly planned: number;
  /** 既存ファイルがあるためスキップした件数 */
  readonly skipped: number;
  readonly failed: readonly PersonalityStaticFailure[];
}

export interface GeneratePersonalityStaticDeps {
  /** LLM プロバイダ。dryRun のときは呼ばれないので null で良い */
  readonly provider: LlmProvider | null;
  /** ファイルが既にあるか(中断・再開のためのスキップ判定) */
  readonly exists: (fileName: string) => boolean;
  /** ファイルを書き出す(dryRun のときは呼ばれない) */
  readonly write: (fileName: string, content: string) => void;
  /** true なら既存ファイルを上書きする(既定 false) */
  readonly force?: boolean;
  /** true なら LLM を呼ばず、書き出し予定を表示するだけ(既定 false) */
  readonly dryRun?: boolean;
  /** 先頭 N 件だけ処理する(品質確認用。未指定なら全件) */
  readonly limit?: number;
  readonly logger?: Logger;
}

const defaultLogger: Logger = {
  info: (m) => console.log(m),
  error: (m) => console.error(m),
};

/** 1 件分のレポートを生成する(決定的な構造化データ → LLM で文章のみ) */
export async function generatePersonalityStaticReport(
  target: PersonalityStaticTarget,
  provider: LlmProvider,
): Promise<PersonalityReport> {
  const structured = personalityStructuredOf(target.potentialType, target.zodiac);
  const prompt = buildPersonalityPrompt(structured);
  const raw = await provider.generate(prompt);
  const items = parsePersonalityItems(raw);
  if (!items) {
    throw new Error("性質レポートの JSON パースに失敗しました");
  }
  return buildReport(structured, items);
}

/** 静的ファイルに書き出す JSON 文字列(API の report と同形状) */
export function serializeStaticReport(report: PersonalityReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * 144 通りを順に生成して書き出す。
 *
 * - 既存ファイルはスキップする(--force で上書き)。途中で失敗しても、再実行すれば
 *   続きから再開できる。
 * - 1 件の失敗では止めず、失敗一覧を最後にログへ残す(CLAUDE.md のバッチ規約)。
 * - dryRun のときは LLM を呼ばず、書き出し予定のファイルを表示するだけ。
 */
export async function generatePersonalityStaticReports(
  deps: GeneratePersonalityStaticDeps,
): Promise<PersonalityStaticResult> {
  const logger = deps.logger ?? defaultLogger;
  const force = deps.force ?? false;
  const dryRun = deps.dryRun ?? false;

  const all = listPersonalityStaticTargets();
  const targets = deps.limit === undefined ? all : all.slice(0, Math.max(0, deps.limit));

  const providerName = dryRun ? "(dry-run)" : (deps.provider?.name ?? "(none)");
  logger.info(
    `[personality:static] provider=${providerName} targets=${String(targets.length)}/${String(all.length)}` +
      `${force ? " force" : ""}${dryRun ? " dry-run" : ""} 開始`,
  );

  const failed: PersonalityStaticFailure[] = [];
  let generated = 0;
  let planned = 0;
  let skipped = 0;
  let index = 0;

  for (const target of targets) {
    index += 1;
    const progress = `${String(index)}/${String(targets.length)}`;
    try {
      if (!force && deps.exists(target.fileName)) {
        skipped += 1;
        logger.info(`[${progress}] skip (既存): ${target.fileName}`);
        continue;
      }

      if (dryRun) {
        planned += 1;
        logger.info(
          `[${progress}] would write: ${target.fileName}` +
            ` (${target.potentialType} × ${target.zodiac})`,
        );
        continue;
      }

      if (!deps.provider) {
        throw new Error("LlmProvider が指定されていません");
      }

      const report = await generatePersonalityStaticReport(target, deps.provider);
      deps.write(target.fileName, serializeStaticReport(report));
      generated += 1;
      logger.info(`[${progress}] ok: ${target.fileName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ fileName: target.fileName, error: message });
      logger.error(`[${progress}] 失敗: ${target.fileName}: ${message}`);
    }
  }

  const result: PersonalityStaticResult = {
    total: all.length,
    targeted: targets.length,
    generated,
    planned,
    skipped,
    failed,
  };

  logger.info(
    `[personality:static] 完了 total=${String(result.total)} target=${String(result.targeted)}` +
      ` ok=${String(generated)} plan=${String(planned)} skip=${String(skipped)} ng=${String(failed.length)}`,
  );
  if (failed.length > 0) {
    logger.error(`[personality:static] 失敗一覧 (${String(failed.length)} 件):`);
    for (const f of failed) {
      logger.error(`  - ${f.fileName}: ${f.error}`);
    }
    logger.error("[personality:static] 再実行すれば未生成分だけを続きから生成します");
  }

  return result;
}
