/**
 * キャラアセット取り込みスクリプト(docs/01 §キャラアセット取り込みパイプライン)
 *
 * キャラリポジトリ(一次情報)の基準画像を、LIFF 配信用に
 * リサイズ + WebP 変換して packages/liff/public/characters/ へ取り込む。
 *
 * - 冪等: 再実行で常に上書き(キャラ側の更新をコマンド1回で反映)
 * - 失敗したキャラはスキップして続行し、最後に失敗一覧を表示する
 *
 * 使い方:
 *   node scripts/import-characters.mjs [キャラリポジトリの characters ディレクトリ]
 *   (省略時: 環境変数 CHAR_REPO_DIR → 既定 ../journal-character-generator/characters)
 *
 * 必要ツール: ffmpeg (PATH 上にあること)
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_SOURCE = resolve(ROOT, "..", "journal-character-generator", "characters");
const OUTPUT_DIR = join(ROOT, "packages", "liff", "public", "characters");

/** 出力画像の幅(px)。モバイル表示用途のためこれで十分 */
const TARGET_WIDTH = 512;
/** WebP 品質 */
const WEBP_QUALITY = 82;

const VARIANTS = [
  { src: "base_male.png", out: "male.webp" },
  { src: "base_female.png", out: "female.webp" },
];

function convertImage(srcPath, outPath) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      srcPath,
      "-vf",
      `scale=${TARGET_WIDTH}:-1`,
      "-quality",
      String(WEBP_QUALITY),
      outPath,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  if (result.error) {
    throw new Error(`ffmpeg の起動に失敗しました: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg が失敗しました (exit ${result.status})`);
  }
}

function main() {
  const sourceDir = resolve(process.argv[2] ?? process.env.CHAR_REPO_DIR ?? DEFAULT_SOURCE);

  if (!existsSync(sourceDir)) {
    console.error(`[import-characters] キャラリポジトリが見つかりません: ${sourceDir}`);
    console.error("パスを引数か CHAR_REPO_DIR で指定してください");
    process.exit(1);
  }

  const charDirs = readdirSync(sourceDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{2}-/.test(e.name))
    .map((e) => e.name)
    .sort();

  if (charDirs.length === 0) {
    console.error(`[import-characters] NN-name 形式のキャラディレクトリがありません: ${sourceDir}`);
    process.exit(1);
  }

  console.log(`[import-characters] 取り込み元: ${sourceDir}`);
  console.log(`[import-characters] 出力先: ${OUTPUT_DIR}`);

  const failures = [];
  let converted = 0;

  for (const dir of charDirs) {
    for (const { src, out } of VARIANTS) {
      const srcPath = join(sourceDir, dir, "reference", src);
      const outDir = join(OUTPUT_DIR, dir);
      const outPath = join(outDir, out);

      if (!existsSync(srcPath)) {
        failures.push(`${dir}/${src}: ソース画像なし`);
        continue;
      }

      try {
        mkdirSync(outDir, { recursive: true });
        convertImage(srcPath, outPath);
        converted += 1;
        console.log(`  ok: ${dir}/${out}`);
      } catch (err) {
        failures.push(`${dir}/${src}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(`[import-characters] 変換完了: ${converted} 件`);
  if (failures.length > 0) {
    console.error(`[import-characters] 失敗: ${failures.length} 件`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main();
