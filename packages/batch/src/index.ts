/**
 * バッチのエントリポイント。
 *
 * 実行モード:
 *   - 手動 1 回実行(テスト・手動トリガー用):
 *       node dist/index.js run-daily [--date YYYY-MM-DD]
 *   - 常駐(cron スケジューラ。毎日 03:00 JST に日次バッチ):
 *       node dist/index.js
 *
 * シークレットは env 経由のみ(config.ts)。ユーザー操作起点のリアルタイム LLM
 * 呼び出しは行わない(バッチのみ)。
 */

import { MasterCalendarProvider } from "@mj/calendar-data";
import cron from "node-cron";
import { getConfig } from "./config.js";
import { runDailyBatch } from "./daily/run.js";
import { closeDb, initConnection } from "./db/connection.js";
import { getActiveUsers, saveDailyFortune } from "./db/queries.js";
import { createLlmProvider } from "./llm/factory.js";

/** JST の今日を "YYYY-MM-DD" で返す(タイムゾーン事故防止のため Intl 使用) */
function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/** argv から "--date YYYY-MM-DD" または "--date=YYYY-MM-DD" を取り出す */
function parseDateArg(argv: readonly string[]): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--date") {
      return argv[i + 1];
    }
    if (arg?.startsWith("--date=")) {
      return arg.slice("--date=".length);
    }
  }
  return undefined;
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function runOnce(date: string): Promise<number> {
  const config = getConfig();
  initConnection(config.databasePath);
  const provider = createLlmProvider(config);
  const calendar = new MasterCalendarProvider();

  const result = await runDailyBatch(date, {
    provider,
    calendar,
    getUsers: getActiveUsers,
    saveFortune: saveDailyFortune,
  });
  return result.failed.length > 0 ? 1 : 0;
}

function startScheduler(): void {
  const config = getConfig();
  // 起動時に接続とプロバイダを検証(キー未設定なら早期に分かりやすく落ちる)
  initConnection(config.databasePath);
  createLlmProvider(config);

  console.log(
    `[batch] scheduler 起動: cron="${config.dailyCron}" tz=${config.cronTimezone} provider=${config.llmProvider}`,
  );

  cron.schedule(
    config.dailyCron,
    () => {
      const date = todayJST();
      const cfg = getConfig();
      const provider = createLlmProvider(cfg);
      const calendar = new MasterCalendarProvider();
      runDailyBatch(date, {
        provider,
        calendar,
        getUsers: getActiveUsers,
        saveFortune: saveDailyFortune,
      }).catch((err: unknown) => {
        const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
        console.error(`[batch] 日次バッチで致命的エラー: ${message}`);
      });
    },
    { timezone: config.cronTimezone },
  );
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (command === "run-daily") {
    const date = parseDateArg(rest) ?? todayJST();
    if (!isValidDate(date)) {
      console.error(`[batch] --date は YYYY-MM-DD 形式で指定してください (got "${date}")`);
      process.exit(2);
    }
    let code = 0;
    try {
      code = await runOnce(date);
    } finally {
      closeDb();
    }
    process.exit(code);
  }

  if (command === undefined) {
    startScheduler();
    return; // 常駐
  }

  console.error(`[batch] 未知のコマンド: ${command}`);
  console.error("usage: node dist/index.js [run-daily [--date YYYY-MM-DD]]");
  process.exit(2);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[batch] 起動エラー: ${message}`);
  process.exit(1);
});
