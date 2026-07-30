/**
 * 性質レポート(AI占い)144 通りの事前生成 CLI(運用用の一回実行スクリプト)。
 *
 * 実行例(リポジトリルートから):
 *   pnpm personality:static:dry        # 何件・どのファイルを書くかの確認のみ。LLM を呼ばない
 *   pnpm personality:static --limit 1  # 1 件だけ生成して文章品質を確認する
 *   pnpm personality:static            # 未生成分だけを生成(中断しても再実行で続きから)
 *   pnpm personality:static --force    # 既存ファイルも作り直す(全 144 件を再生成)
 *
 * 出力先(既定): packages/liff/public/personality/<タイプ slug>-<星座>.json
 *   例: er-plus-aries.json  ※ "+"/"-" はファイル名に使わない(engine の slug 規則)
 *
 * 必要な環境変数(.env / Docker env 経由のみ。コードに書かない。値はログに出さない):
 *   LLM_PROVIDER      … claude | openai | mock(既定 claude)
 *   ANTHROPIC_API_KEY … claude 使用時
 *   OPENAI_API_KEY    … openai 使用時
 *   CLAUDE_MODEL / OPENAI_MODEL / LLM_MAX_TOKENS … 任意(既定は config.ts)
 *   ※ --dry-run では一切不要(LLM を呼ばないため)
 *
 * 注意: 生成後は LIFF(Cloudflare Pages)を再デプロイしないと配信されない。
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONALITY_STATIC_DIR } from "@mj/engine";
import { getConfig } from "../config.js";
import { createLlmProvider } from "../llm/factory.js";
import type { LlmProvider } from "../llm/provider.js";
import { generatePersonalityStaticReports, listPersonalityStaticTargets } from "./static.js";

/** このファイルから見たリポジトリルート(src/personality/… → src → batch → packages → root) */
function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..", "..");
}

/** 既定の出力先: LIFF の静的アセット置き場 */
function defaultOutDir(): string {
  return path.join(repoRoot(), "packages", "liff", "public", PERSONALITY_STATIC_DIR);
}

/** このスクリプトが使う環境変数(シークレットは .env / Docker env 経由のみ) */
const ENV_KEYS = [
  "LLM_PROVIDER",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "CLAUDE_MODEL",
  "OPENAI_MODEL",
  "LLM_MAX_TOKENS",
] as const;

/**
 * リポジトリルートの .env を読み込む(存在しなければ何もしない)。
 * シェルで明示指定された値のほうを優先する。値はログに出さない。
 */
function loadDotEnv(): void {
  const envPath = path.join(repoRoot(), ".env");
  const preset = new Map<string, string>();
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value) preset.set(key, value);
  }
  try {
    process.loadEnvFile(envPath);
  } catch {
    return;
  }
  for (const [key, value] of preset) {
    process.env[key] = value;
  }
  console.log(`.env を読み込みました: ${envPath}`);
}

interface CliOptions {
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly limit: number | undefined;
  readonly outDir: string;
}

/** argv を解析する(--limit / --out は値を取る) */
function parseArgs(argv: readonly string[]): CliOptions {
  const argValue = (name: string): string | undefined => {
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i];
      if (arg === `--${name}`) return argv[i + 1];
      if (arg?.startsWith(`--${name}=`)) return arg.slice(name.length + 3);
    }
    return undefined;
  };

  const limitRaw = argValue("limit");
  let limit: number | undefined;
  if (limitRaw !== undefined) {
    limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`--limit は 1 以上の整数で指定してください (got "${limitRaw}")`);
    }
  }

  const out = argValue("out");
  return {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
    limit,
    // 相対パスはリポジトリルート基準で解決する(pnpm 経由だと cwd が packages/batch になるため)
    outDir: out ? path.resolve(repoRoot(), out) : defaultOutDir(),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const targets = listPersonalityStaticTargets();

  console.log("=== 性質レポート静的生成 ===");
  console.log(`組み合わせ: ${String(targets.length)} 通り (12 タイプ × 12 星座)`);
  console.log(`出力先: ${options.outDir}`);
  if (options.limit !== undefined) {
    console.log(`--limit ${String(options.limit)}: 先頭 ${String(options.limit)} 件のみ処理します`);
  }
  if (options.force) {
    console.log("--force: 既存ファイルも上書きします");
  }

  let provider: LlmProvider | null = null;
  if (options.dryRun) {
    console.log("--dry-run: LLM は呼び出さず、書き出し予定のみ表示します\n");
  } else {
    loadDotEnv();
    // この CLI は DB を使わない(出力は静的 JSON ファイル)。getConfig() が必須とする
    // DATABASE_PATH を、このプロセス内だけのダミーで満たす。
    if (!process.env.DATABASE_PATH) {
      process.env.DATABASE_PATH = ":memory:";
    }
    provider = createLlmProvider(getConfig());
    console.log(`LLM プロバイダ: ${provider.name}\n`);
    mkdirSync(options.outDir, { recursive: true });
  }

  const result = await generatePersonalityStaticReports({
    provider,
    exists: (fileName) => existsSync(path.join(options.outDir, fileName)),
    write: (fileName, content) => {
      writeFileSync(path.join(options.outDir, fileName), content, "utf8");
    },
    force: options.force,
    dryRun: options.dryRun,
    limit: options.limit,
  });

  if (options.dryRun) {
    console.log(
      `\ndry-run 完了: 生成予定 ${String(result.planned)} 件 / 既存スキップ ${String(result.skipped)} 件` +
        ` (対象 ${String(result.targeted)} / 全 ${String(result.total)})`,
    );
    console.log("実際に生成するには --dry-run を外して実行してください。");
    return;
  }

  console.log(
    `\n完了: 生成 ${String(result.generated)} 件 / スキップ ${String(result.skipped)} 件 /` +
      ` 失敗 ${String(result.failed.length)} 件`,
  );
  console.log("生成後は LIFF(Cloudflare Pages)を再デプロイすると配信されます。");
  if (result.failed.length > 0) {
    // 失敗が残っている場合は非ゼロ終了(CI・運用で気づけるようにする)
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`性質レポートの静的生成に失敗しました: ${reason}`);
  process.exitCode = 1;
});
