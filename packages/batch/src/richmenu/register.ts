/**
 * リッチメニュー登録スクリプト(運用用の一回実行 CLI)。
 *
 * 実行例(リポジトリルートから):
 *   pnpm richmenu:dry     # 送信内容の確認のみ。LINE API を一切叩かない
 *   pnpm richmenu:list    # 現在登録されているリッチメニュー一覧
 *   pnpm richmenu         # 登録 → 画像アップロード → デフォルト適用 → 旧メニュー削除
 *
 * 必要な環境変数(.env / Docker env 経由のみ。コードに書かない):
 *   LINE_CHANNEL_ACCESS_TOKEN … Messaging API のチャネルアクセストークン(--dry-run 時は不要)
 *   LIFF_ID                   … LIFF ID(ディープリンク生成に使用。dry-run でも必須)
 *
 * 安全のための処理順(失敗しても「メニュー無し」状態を作らない):
 *   1. 既存メニュー一覧を取得(削除対象の記録のみ。ここでは消さない)
 *   2. 新メニューを作成
 *   3. 画像をアップロード
 *   4. デフォルトリッチメニューとして全ユーザーに適用
 *   5. ここまで成功して初めて、1 で記録した旧メニューを削除
 *   ※ 2〜4 の途中で失敗した場合は、作りかけの新メニューのみを後片付けする
 *     (旧メニューは残るので、ユーザーには常にどれかのメニューが出ている)
 *
 * 再実行すると毎回新しいリッチメニューを作って差し替えるため、冪等に近い運用ができる。
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpRichMenuApi, type RichMenuApi, type RichMenuSummary } from "./client.js";
import {
  RICHMENU_HEIGHT,
  RICHMENU_WIDTH,
  buildRichMenu,
  coveredRatio,
  validateAreas,
} from "./definition.js";

/** LINE のリッチメニュー画像サイズ上限(1MB) */
const MAX_IMAGE_BYTES = 1024 * 1024;

/** このファイルから見たリポジトリルート */
function repoRoot(): string {
  // src/richmenu/register.ts → src → batch → packages → リポジトリルート
  // dist/richmenu/register.js からも同じ階層数になる。
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..", "..");
}

/** 既定の画像パス(リポジトリの infra/richmenu/richmenu.jpg) */
function defaultImagePath(): string {
  return path.join(repoRoot(), "infra", "richmenu", "richmenu.jpg");
}

/** このスクリプトが使う環境変数 */
const ENV_KEYS = ["LINE_CHANNEL_ACCESS_TOKEN", "LIFF_ID"] as const;

/**
 * リポジトリルートの .env を読み込む(存在しなければ何もしない)。
 * シェルで明示指定された値のほうを優先する。
 * ★シークレットは .env / Docker env 経由のみ。値はログに出さない。
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
    // .env が無い / 読めない場合はシェルの環境変数だけで動かす
    return;
  }
  for (const [key, value] of preset) {
    process.env[key] = value;
  }
  console.log(`.env を読み込みました: ${envPath}`);
}

/** 拡張子から Content-Type を決める(LINE は jpeg / png のみ受け付ける) */
function contentTypeFor(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  throw new Error(`リッチメニュー画像は .jpg / .jpeg / .png のみ対応です (got "${ext}")`);
}

interface CliOptions {
  readonly dryRun: boolean;
  readonly listOnly: boolean;
  readonly keepOld: boolean;
  readonly imagePath: string;
}

/** argv を解析する(--image のみ値を取る) */
function parseArgs(argv: readonly string[]): CliOptions {
  let imagePath: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--image") {
      imagePath = argv[i + 1];
    } else if (arg?.startsWith("--image=")) {
      imagePath = arg.slice("--image=".length);
    }
  }
  return {
    dryRun: argv.includes("--dry-run"),
    listOnly: argv.includes("--list"),
    keepOld: argv.includes("--keep-old"),
    // 相対パスはリポジトリルート基準で解決する(pnpm 経由だと cwd が
    // packages/batch になり、cwd 基準では直感に反するため)。
    imagePath: imagePath ? path.resolve(repoRoot(), imagePath) : defaultImagePath(),
  };
}

/** 必須の環境変数を読む。無ければ分かりやすいエラーにする(値はログに出さない)。 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. .env に設定してから実行してください`);
  }
  return value;
}

// ── 各モードの処理 ──────────────────────────────────────────────

/** --list: 現在登録されているリッチメニューを表示 */
async function runList(api: RichMenuApi): Promise<void> {
  const menus = await api.list();
  if (menus.length === 0) {
    console.log("登録済みのリッチメニューはありません。");
    return;
  }
  console.log(`登録済みリッチメニュー: ${String(menus.length)} 件`);
  for (const m of menus) {
    console.log(`  - ${m.richMenuId}  name="${m.name}"  chatBarText="${m.chatBarText}"`);
  }
}

/** 旧メニューを削除する。1 件失敗しても続行し、失敗一覧をログに残す。 */
async function deleteOldMenus(
  api: RichMenuApi,
  oldMenus: readonly RichMenuSummary[],
  newRichMenuId: string,
): Promise<void> {
  const targets = oldMenus.filter((m) => m.richMenuId !== newRichMenuId);
  if (targets.length === 0) {
    console.log("[5/5] 削除対象の旧リッチメニューはありません。");
    return;
  }

  const failed: string[] = [];
  for (const m of targets) {
    try {
      await api.remove(m.richMenuId);
      console.log(`[5/5] 旧メニューを削除: ${m.richMenuId} (name="${m.name}")`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      failed.push(`${m.richMenuId}: ${reason}`);
    }
  }

  if (failed.length > 0) {
    // 削除失敗は致命的ではない(新メニューは既に適用済み)。握りつぶさずログに残す。
    console.error(`[5/5] 旧メニューの削除に失敗: ${String(failed.length)} 件`);
    for (const f of failed) console.error(`  - ${f}`);
  }
}

/** 作りかけの新メニューを後片付けする(適用前の失敗時のみ呼ぶ) */
async function cleanupOrphan(api: RichMenuApi, richMenuId: string): Promise<void> {
  try {
    await api.remove(richMenuId);
    console.error(`  → 作りかけのリッチメニュー ${richMenuId} を削除しました(旧メニューは維持)`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(
      `  → 作りかけのリッチメニュー ${richMenuId} の削除にも失敗しました: ${reason}\n    手動で削除してください(pnpm richmenu:list で ID を確認)`,
    );
  }
}

// ── エントリポイント ────────────────────────────────────────────

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  loadDotEnv();

  // LIFF ID はディープリンク生成に必須。dry-run でも実物と同じ JSON を出すため要求する。
  const liffId = requireEnv("LIFF_ID");
  const menu = buildRichMenu({ liffId });

  // 幾何検証。POST の前に必ず通す(はみ出し・重なりのあるメニューは登録しない)。
  const problems = validateAreas(menu.areas);
  if (problems.length > 0) {
    console.error("リッチメニュー領域の検証に失敗しました:");
    for (const p of problems) console.error(`  - ${p}`);
    throw new Error("rich menu area validation failed");
  }
  // 画像全体を覆わない設計(上段の左・中央は装飾)なので、被覆率を出して
  // 「意図した装飾スペースか、領域の置き忘れか」を目視で判断できるようにする。
  const ratio = Math.round(coveredRatio(menu.areas) * 100);
  console.log(
    `領域検証 OK: ${String(menu.areas.length)} 領域 / ` +
      `${String(RICHMENU_WIDTH)}×${String(RICHMENU_HEIGHT)} のうち ${String(ratio)}% がタップ可能` +
      `(残りは装飾スペースで無反応)`,
  );

  if (options.dryRun) {
    console.log("\n=== dry-run: LINE API は呼び出しません ===");
    console.log(`画像パス: ${options.imagePath}`);
    console.log("送信予定の richmenu オブジェクト:");
    console.log(JSON.stringify(menu, null, 2));
    console.log("\n=== 領域とアクションの一覧 ===");
    for (const [i, area] of menu.areas.entries()) {
      const { x, y, width, height } = area.bounds;
      const act =
        area.action.type === "uri"
          ? `uri    → ${area.action.uri}`
          : `message→ "${area.action.text}"`;
      console.log(
        `  ${String(i + 1)}. [${area.action.label}] ` +
          `x=${String(x)} y=${String(y)} w=${String(width)} h=${String(height)}  ${act}`,
      );
    }
    return;
  }

  // ここから実 API。トークンは env からのみ取得し、ログには出さない。
  const api = new HttpRichMenuApi(requireEnv("LINE_CHANNEL_ACCESS_TOKEN"));

  if (options.listOnly) {
    await runList(api);
    return;
  }

  // 画像は API を叩く前に読み込んで検証する(不正なら何も作らない)。
  const contentType = contentTypeFor(options.imagePath);
  let image: Buffer;
  try {
    image = await readFile(options.imagePath);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    throw new Error(`リッチメニュー画像を読み込めません (${options.imagePath}): ${reason}`);
  }
  if (image.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `リッチメニュー画像が 1MB を超えています (${String(image.byteLength)} bytes / ${options.imagePath})`,
    );
  }
  console.log(`画像: ${options.imagePath} (${String(image.byteLength)} bytes, ${contentType})`);

  // 1. 既存一覧を取得(この時点では消さない)
  const oldMenus = await api.list();
  console.log(`[1/5] 既存のリッチメニュー: ${String(oldMenus.length)} 件`);

  // 2. 新メニューを作成
  const richMenuId = await api.create(menu);
  console.log(`[2/5] 作成しました: ${richMenuId}`);

  // 3. 画像アップロード / 4. デフォルト適用。失敗したら新メニューだけ後片付けする。
  try {
    await api.uploadImage(richMenuId, image, contentType);
    console.log("[3/5] 画像をアップロードしました");

    await api.setDefault(richMenuId);
    console.log("[4/5] デフォルトリッチメニューとして全ユーザーに適用しました");
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.error(`[3-4/5] 失敗しました: ${reason}`);
    await cleanupOrphan(api, richMenuId);
    throw err;
  }

  // 5. 適用が成功して初めて旧メニューを削除する
  if (options.keepOld) {
    console.log("[5/5] --keep-old が指定されたため旧メニューは削除しません。");
  } else {
    await deleteOldMenus(api, oldMenus, richMenuId);
  }

  console.log("\n完了しました。LINE アプリでトークを開き直して表示を確認してください。");
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err);
  console.error(`リッチメニュー登録に失敗しました: ${reason}`);
  process.exitCode = 1;
});
