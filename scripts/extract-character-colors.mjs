/**
 * キャラテーマカラー抽出スクリプト(docs/08 P-A: テーマカラー HEX 確定の補助)
 *
 * packages/liff/public/characters/NN-name/{male,female}.webp から
 * キャラの「識別色」を抽出し、CHARACTER_THEME_SEED の差し替え候補を出力する。
 *
 * docs/06 の厳守事項「独自の色を発明しない」に従い、
 * 色相・彩度は画像から抽出した値をそのまま使い、accent は
 * 「色相・彩度を保ったまま明度だけを下げて」白文字 WCAG AA(>= 4.5)を満たす値にする。
 *
 * 抽出の考え方:
 *   1. 白背景・線画の黒・無彩色・肌色を画素レベルで除外する
 *   2. 残った画素の色相ヒストグラムを、彩度^2 x 明度重み で重み付けする
 *   3. キャラごとの識別部位(髪・上着)の色相レンジ IDENTITY_HUE_RANGE の中で、
 *      最も面積の大きい色相帯を選ぶ
 *   4. その色相帯にある彩度上位の画素を平均して代表色(primary)とする
 *   5. primary の色相・彩度を保ったまま明度だけ下げて accent を作る
 *
 * IDENTITY_HUE_RANGE を使わない「完全自動」の選択結果も参考値として併記する
 * (12 キャラ中央値ヒストグラムで割る TF-IDF 方式。肌・髪の茶に引っ張られる
 *  ケースがあるため採用値には使わない)。
 *
 * - 依存追加なし: webp のデコードは ffmpeg(scripts/import-characters.mjs と同じ前提)
 * - 画像は読み取りのみ。リポジトリのファイルは書き換えない
 *
 * 使い方:
 *   node scripts/extract-character-colors.mjs [--html <出力先HTML>] [--json <出力先JSON>]
 *
 * 必要ツール: ffmpeg (PATH 上にあること)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHAR_ASSET_DIR = join(ROOT, "packages", "liff", "public", "characters");
const MAPPING_TS = join(ROOT, "packages", "engine", "src", "mapping.ts");
const THEMES_TS = join(ROOT, "packages", "liff", "src", "styles", "character-themes.ts");

/** 解析時の縮小幅(px)。識別色の抽出には十分で、高速 */
const SAMPLE_WIDTH = 200;
/** 色相ヒストグラムのビン数(5 度刻み) */
const HUE_BINS = 72;
/** 代表色の算出に使う「彩度上位」の割合 */
const TOP_CHROMA_RATIO = 0.3;
/** 支配色相からの許容ずれ(度) */
const HUE_WINDOW_DEG = 22;
/** 色相クラスタの半幅(ビン数)。3 = 前後 15 度 = 幅 35 度 */
const CLUSTER_HALF_BINS = 3;
/** 識別色の候補とみなす最低シェア(そのキャラの色相分布に占める割合) */
const MIN_CLUSTER_SHARE = 0.05;
/**
 * ベースライン(中央値)の下限。
 * 1 キャラしか持たない色相は中央値がほぼ 0 になり、ごく僅かな面積の色が
 * 過大評価されるため下限で頭打ちにする。
 */
const BASE_FLOOR = 0.005;
/**
 * スコアにおける面積(シェア)の効き。
 * 1 に近いほど「面積の大きい色」、0 に近いほど「そのキャラだけが持つ色」を選ぶ。
 * 0.5(平方根)が、肌/髪の茶に負けず、かつ小さな小物の色を拾わない釣り合い点。
 */
const SHARE_EXPONENT = 0.5;
/** WCAG AA(通常テキスト)のコントラスト比 */
const AA_RATIO = 4.5;
/** accent の目標コントラスト比(AA + 安全マージン) */
const ACCENT_TARGET_RATIO = 4.6;
/** male / female の識別色相がこれ以上離れていたら食い違いとして報告する(度) */
const DIVERGENCE_DEG = 20;
/** male / female の代表色がこれ以上離れていたら食い違いとして報告する(色差) */
const DIVERGENCE_COLOR_DIST = 60;

const VARIANTS = ["male", "female"];

/**
 * キャラの識別部位(髪・上着)が占める色相レンジ [開始, 終了](度・円環)。
 *
 * 24 枚を目視し「そのキャラの識別色を担っている部位」を確認して記録したもの。
 * ここで決めるのは<b>画像のどこから色を採るか</b>であって色そのものではない
 * (HEX は必ずその範囲内の画素から算出する)。肌・線画・白背景は別途除外している。
 *
 * これがないと、全キャラ共通の肌色や髪の茶が最大面積を占めるキャラ
 * (例: 07-takane は上着が濃緑だが面積では髪の茶が勝つ)で識別色を取り違える。
 */
const IDENTITY_HUE_RANGE = {
  // 光: 金〜クリームの髪とジャケット
  "IR+": [35, 60],
  // 月: 藍〜紺の髪とカーディガン
  "IR-": [215, 250],
  // 風: 若草色の髪とジャケット
  "IL+": [70, 120],
  // 霧: グレー〜モーブのスーツと髪(彩度が低く色相はモーブ寄り)
  "IL-": [300, 355],
  // 炎: 赤い髪と赤いシャツ
  "PR+": [350, 20],
  // 滝: 濃紺〜青緑のカーディガンと髪(差し色のターコイズを含む)
  "PR-": [170, 215],
  // 山: 深緑〜カーキのジャケット(髪は茶なので除外)
  "PL+": [55, 100],
  // 岩: 茶のカーディガンとカーキのパンツ
  "PL-": [25, 55],
  // 虹: パステルの多色。単色に落とせないため要確認(下の NOTES 参照)
  "ER+": [290, 340],
  // 露: 淡い水色〜藤色の髪とシャツ
  "ER-": [185, 250],
  // 朝陽: コーラルオレンジのカーディガン
  "EL+": [10, 35],
  // 湖: 深い藍緑のセーターとマグ
  "EL-": [180, 215],
};

/** 人間の確認が要る点(色見本 HTML と報告に出す) */
const NOTES = {
  "ER+": "虹キャラのためパステル多色。単色に確定できない(候補: 藤色〜桃 / 淡金 / 淡水色)。要判断",
};

// ── 色ユーティリティ ────────────────────────────────────────

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (chroma > 0) {
    if (max === rn) {
      h = ((gn - bn) / chroma) % 6;
    } else if (max === gn) {
      h = (bn - rn) / chroma + 2;
    } else {
      h = (rn - gn) / chroma + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * l - 1));
  return { h, s, l, chroma };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb;
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l - c / 2;
  return rgb.map((v) => Math.round((v + m) * 255));
}

function toHex([r, g, b]) {
  const part = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function parseHex(hex) {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG 相対輝度 */
function relativeLuminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG コントラスト比 */
function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(parseHex(hexA));
  const lb = relativeLuminance(parseHex(hexB));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 円環上の色相差(度, 0..180) */
function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 知覚的な色差(redmean 近似・0..255 スケール)。male/female の食い違い検知に使う */
function colorDistance(hexA, hexB) {
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

// ── 画像デコード(ffmpeg 経由・依存追加なし) ─────────────────

function decodeImage(path) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      path,
      "-vf",
      `scale=${SAMPLE_WIDTH}:-2`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-",
    ],
    { maxBuffer: 1024 * 1024 * 256 },
  );
  if (result.error) {
    throw new Error(`ffmpeg の起動に失敗しました: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg が失敗しました (exit ${result.status}): ${result.stderr?.toString()}`);
  }
  const buf = result.stdout;
  const height = buf.length / (SAMPLE_WIDTH * 4);
  if (!Number.isInteger(height) || height <= 0) {
    throw new Error(`デコード結果のサイズが不正です: ${buf.length} bytes`);
  }
  return { data: buf, width: SAMPLE_WIDTH, height };
}

// ── 画素の選別 ────────────────────────────────────────────

/**
 * キャラの識別色に無関係な画素を落とす。
 * 白背景・線画の黒/グレー・淡い肌色を除外し、彩度のある画素だけを残す。
 */
function isIdentityPixel({ l, chroma, h }) {
  // 白背景・紙の白
  if (l > 0.94 && chroma < 0.08) return false;
  // 線画の黒〜濃グレー
  if (l < 0.14) return false;
  // 無彩色(グレー・影)
  if (chroma < 0.06) return false;
  // 肌色帯。12 キャラすべてに大面積で出るため識別色にならない。
  // 桃〜橙の狭い色相 x 中〜高明度 x 中彩度 に限定し、
  // より鮮やかな橙(朝陽)・より暗い茶(岩)・より黄寄りの金(光)は残す。
  if (h >= 12 && h <= 38 && l >= 0.62 && l <= 0.86 && chroma >= 0.12 && chroma <= 0.45) {
    return false;
  }
  return true;
}

/** 明度による重み(極端に明るい/暗い画素の影響を抑える) */
function lightnessWeight(l) {
  if (l < 0.2) return l / 0.2;
  if (l > 0.85) return Math.max(0, (0.96 - l) / 0.11);
  return 1;
}

/** 画素を型付き配列にまとめる(24 枚分を保持するためコンパクトに持つ) */
function collectPixels(image) {
  const { data, width, height } = image;
  const count = width * height;
  const hue = new Float32Array(count);
  const chroma = new Float32Array(count);
  const weight = new Float32Array(count);
  const rgb = new Uint8Array(count * 3);
  let n = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (data[o + 3] < 128) continue;
    const px = rgbToHsl(data[o], data[o + 1], data[o + 2]);
    if (!isIdentityPixel(px)) continue;
    hue[n] = px.h;
    chroma[n] = px.chroma;
    // 彩度の二乗 x 明度重み: 淡い色より濃い色の主張を強くする
    weight[n] = px.chroma * px.chroma * lightnessWeight(px.l);
    rgb[n * 3] = data[o];
    rgb[n * 3 + 1] = data[o + 1];
    rgb[n * 3 + 2] = data[o + 2];
    n++;
  }
  return {
    count: n,
    hue: hue.subarray(0, n),
    chroma: chroma.subarray(0, n),
    weight: weight.subarray(0, n),
    rgb: rgb.subarray(0, n * 3),
  };
}

// ── 色相ヒストグラム ──────────────────────────────────────

/** 円環方向に平滑化(色相の分裂を防ぐ) */
function smoothCircular(values) {
  const kernel = [1, 2, 3, 2, 1];
  const sumKernel = 9;
  const out = new Array(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    for (let k = -2; k <= 2; k++) {
      sum += values[(i + k + values.length) % values.length] * kernel[k + 2];
    }
    out[i] = sum / sumKernel;
  }
  return out;
}

/** 合計 1 に正規化した色相ヒストグラム(平滑化済み) */
function hueHistogram(pixels) {
  const raw = new Array(HUE_BINS).fill(0);
  let total = 0;
  for (let i = 0; i < pixels.count; i++) {
    const bin = Math.min(HUE_BINS - 1, Math.floor((pixels.hue[i] / 360) * HUE_BINS));
    raw[bin] += pixels.weight[i];
    total += pixels.weight[i];
  }
  const smooth = smoothCircular(raw);
  const norm = total > 0 ? 1 / total : 0;
  return smooth.map((v) => v * norm);
}

/** 複数ヒストグラムの平均 */
function meanHistogram(histograms) {
  const out = new Array(HUE_BINS).fill(0);
  for (const h of histograms) {
    for (let i = 0; i < HUE_BINS; i++) out[i] += h[i] / histograms.length;
  }
  return out;
}

/**
 * 12 キャラの中央値ヒストグラム。
 * 肌色や髪の茶のように「どのキャラにも出る色」はここで高い値になり、
 * 識別色のスコアリングで自動的に抑制される(平均ではなく中央値にするのは、
 * 1 キャラだけが持つ色にベースラインを引きずられないため)。
 */
function medianHistogram(histograms) {
  const out = new Array(HUE_BINS).fill(0);
  for (let i = 0; i < HUE_BINS; i++) {
    const col = histograms.map((h) => h[i]).sort((a, b) => a - b);
    const mid = col.length >> 1;
    out[i] = col.length % 2 === 0 ? (col[mid - 1] + col[mid]) / 2 : col[mid];
  }
  return out;
}

/** ビン i を中心とした +-CLUSTER_HALF_BINS の合計シェア */
function windowShare(hist, i) {
  let sum = 0;
  for (let k = -CLUSTER_HALF_BINS; k <= CLUSTER_HALF_BINS; k++) {
    sum += hist[(i + k + HUE_BINS) % HUE_BINS];
  }
  return sum;
}

/**
 * 「そのキャラに固有の色相」の上位クラスタを返す。
 *
 * score = シェア^SHARE_EXPONENT / max(12 キャラ中央値の同帯シェア, BASE_FLOOR)
 *
 * 分母で全キャラ共通の肌/髪の茶を抑え、分子でそのキャラ内での面積を効かせる。
 * MIN_CLUSTER_SHARE 未満の色相帯(小物・差し色)は候補にしない。
 */
function topDistinctClusters(charHist, baseHist, count) {
  const charWin = charHist.map((_, i) => windowShare(charHist, i));
  const baseWin = charHist.map((_, i) => windowShare(baseHist, i));
  const score = charWin.map((share, i) =>
    share < MIN_CLUSTER_SHARE ? 0 : share ** SHARE_EXPONENT / Math.max(baseWin[i], BASE_FLOOR),
  );
  const hasEligible = score.some((v) => v > 0);
  const effective = hasEligible ? score : charWin;

  const used = new Set();
  const clusters = [];
  for (let n = 0; n < count; n++) {
    let best = -1;
    let bestVal = 0;
    for (let i = 0; i < HUE_BINS; i++) {
      if (used.has(i) || effective[i] <= bestVal) continue;
      bestVal = effective[i];
      best = i;
    }
    if (best < 0) break;
    for (let k = -CLUSTER_HALF_BINS; k <= CLUSTER_HALF_BINS; k++) {
      used.add((best + k + HUE_BINS) % HUE_BINS);
    }
    clusters.push({
      hue: (best + 0.5) * (360 / HUE_BINS),
      share: charWin[best],
      score: score[best],
      distinctness: charWin[best] / Math.max(baseWin[best], BASE_FLOOR),
    });
  }
  return { clusters, chosen: clusters[0] ?? null };
}

/** 円環上で hue が [from, to] の範囲に入るか */
function inHueRange(hue, range) {
  if (!range) return true;
  const [from, to] = range;
  return from <= to ? hue >= from && hue <= to : hue >= from || hue <= to;
}

/**
 * 識別部位の色相レンジ内で、最も面積の大きい色相帯を選ぶ。
 * レンジで肌・髪の茶を除いてあるため、ここは単純な最大面積でよい。
 */
function pickIdentityHue(charHist, range) {
  let best = -1;
  let bestVal = -1;
  for (let i = 0; i < HUE_BINS; i++) {
    const hue = (i + 0.5) * (360 / HUE_BINS);
    if (!inHueRange(hue, range)) continue;
    const v = windowShare(charHist, i);
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  }
  if (best < 0) return null;
  return { hue: (best + 0.5) * (360 / HUE_BINS), share: bestVal };
}

/** 識別色相のまわりの「彩度上位」画素を平均して代表色を出す */
function representativeColor(pixelSets, dominantHue, range) {
  const picked = [];
  for (const pixels of pixelSets) {
    for (let i = 0; i < pixels.count; i++) {
      if (hueDistance(pixels.hue[i], dominantHue) > HUE_WINDOW_DEG) continue;
      if (!inHueRange(pixels.hue[i], range)) continue;
      picked.push({
        chroma: pixels.chroma[i],
        r: pixels.rgb[i * 3],
        g: pixels.rgb[i * 3 + 1],
        b: pixels.rgb[i * 3 + 2],
      });
    }
  }
  if (picked.length === 0) return null;
  picked.sort((a, b) => b.chroma - a.chroma);
  const take = Math.max(1, Math.min(picked.length, Math.round(picked.length * TOP_CHROMA_RATIO)));
  const top = picked.slice(0, take);
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of top) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  return {
    hex: toHex([
      Math.round(r / top.length),
      Math.round(g / top.length),
      Math.round(b / top.length),
    ]),
    sampleCount: picked.length,
  };
}

// ── accent の導出(色相・彩度を保ったまま明度だけ下げる) ──────

function deriveAccent(primaryHex) {
  const [r, g, b] = parseHex(primaryHex);
  const { h, s, l: baseL } = rgbToHsl(r, g, b);
  if (contrastRatio(primaryHex, "#ffffff") >= AA_RATIO) {
    return { hex: primaryHex, adjusted: false };
  }
  // 明度を下げるとコントラストは単調に上がるので二分探索
  let lo = 0;
  let hi = baseL;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(toHex(hslToRgb(h, s, mid)), "#ffffff") >= ACCENT_TARGET_RATIO) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  let l = lo;
  let hex = toHex(hslToRgb(h, s, l));
  // 8bit 丸めで AA を割った場合に備えて 1 段ずつ暗くする
  let guard = 0;
  while (contrastRatio(hex, "#ffffff") < AA_RATIO && guard < 60) {
    l = Math.max(0, l - 0.005);
    hex = toHex(hslToRgb(h, s, l));
    guard++;
  }
  return { hex, adjusted: true };
}

// ── リポジトリからの読み取り(タイプ ID と現行値) ─────────────

function loadCharacterMap() {
  const src = readFileSync(MAPPING_TS, "utf8");
  const blocks = src.split(/typeId:\s*"/).slice(1);
  const map = [];
  for (const block of blocks) {
    const typeId = block.slice(0, block.indexOf('"'));
    const typeName = block.match(/typeName:\s*"([^"]+)"/)?.[1] ?? "";
    const male = block.match(/characterMale:\s*"([^"]+)"/)?.[1] ?? "";
    const female = block.match(/characterFemale:\s*"([^"]+)"/)?.[1] ?? "";
    const dir = block.match(/directoryKey:\s*"characters\/([^/"]+)\/"/)?.[1] ?? "";
    if (!typeId || !dir) continue;
    map.push({ typeId, typeName, male, female, dir });
  }
  return map;
}

function loadCurrentSeed() {
  const src = readFileSync(THEMES_TS, "utf8");
  const re =
    /"([EIP][LR][+-])":\s*\{\s*primary:\s*"(#[0-9a-fA-F]{6})",\s*accent:\s*"(#[0-9a-fA-F]{6})",\s*onAccent:\s*"(#[0-9a-fA-F]{6})"/g;
  const seed = {};
  let m = re.exec(src);
  while (m !== null) {
    seed[m[1]] = { primary: m[2], accent: m[3], onAccent: m[4] };
    m = re.exec(src);
  }
  return seed;
}

// ── 解析 ─────────────────────────────────────────────────

/** 1 枚を読み込んで画素セットと色相ヒストグラムを返す */
function analyzeImageFile(path) {
  if (!existsSync(path)) {
    throw new Error(`画像がありません: ${path}`);
  }
  const pixels = collectPixels(decodeImage(path));
  if (pixels.count === 0) {
    throw new Error(`識別色となる画素が見つかりませんでした: ${path}`);
  }
  return { pixels, hist: hueHistogram(pixels) };
}

function analyzeCharacter(entry, images, baseHist) {
  const range = IDENTITY_HUE_RANGE[entry.typeId];
  if (!range) throw new Error(`IDENTITY_HUE_RANGE が未定義です: ${entry.typeId}`);
  const charHist = meanHistogram(VARIANTS.map((v) => images[v].hist));

  const chosen = pickIdentityHue(charHist, range);
  if (!chosen) throw new Error(`識別色相を決定できませんでした: ${entry.dir}`);

  const rep = representativeColor(
    VARIANTS.map((v) => images[v].pixels),
    chosen.hue,
    range,
  );
  if (!rep) throw new Error(`代表色を算出できませんでした: ${entry.dir}`);

  // 参考: 色相レンジを与えずに自動選択した場合の結果(取り違えの検知用)
  const auto = topDistinctClusters(charHist, baseHist, 3);
  const autoRep = auto.chosen
    ? representativeColor(
        VARIANTS.map((v) => images[v].pixels),
        auto.chosen.hue,
      )
    : null;

  const perVariant = {};
  for (const v of VARIANTS) {
    const picked = pickIdentityHue(images[v].hist, range);
    const vrep = picked ? representativeColor([images[v].pixels], picked.hue, range) : null;
    perVariant[v] = { hue: picked?.hue ?? 0, share: picked?.share ?? 0, hex: vrep?.hex ?? null };
  }
  const variantHueDiff = hueDistance(perVariant.male.hue, perVariant.female.hue);
  const variantColorDiff =
    perVariant.male.hex && perVariant.female.hex
      ? colorDistance(perVariant.male.hex, perVariant.female.hex)
      : 0;

  const primary = rep.hex;
  const accent = deriveAccent(primary);
  const onAccent = "#ffffff";

  return {
    ...entry,
    primary,
    accent: accent.hex,
    accentAdjusted: accent.adjusted,
    onAccent,
    contrast: contrastRatio(accent.hex, onAccent),
    primaryContrast: contrastRatio(primary, "#ffffff"),
    dominantHue: chosen.hue,
    dominantShare: chosen.share,
    hueRange: range,
    note: NOTES[entry.typeId] ?? null,
    autoHue: auto.chosen?.hue ?? null,
    autoHex: autoRep?.hex ?? null,
    clusters: auto.clusters,
    perVariant,
    variantHueDiff,
    variantColorDiff,
    diverged: variantHueDiff >= DIVERGENCE_DEG || variantColorDiff >= DIVERGENCE_COLOR_DIST,
  };
}

// ── 出力 ─────────────────────────────────────────────────

function embedImage(dir, variant) {
  const path = join(CHAR_ASSET_DIR, dir, `${variant}.webp`);
  return `data:image/webp;base64,${readFileSync(path).toString("base64")}`;
}

function buildHtml(results, currentSeed) {
  const rows = results
    .map((r) => {
      const cur = currentSeed[r.typeId];
      const curPrimaryContrast = cur ? contrastRatio(cur.primary, "#ffffff").toFixed(2) : "-";
      const curAccentContrast = cur ? contrastRatio(cur.accent, cur.onAccent).toFixed(2) : "-";
      const clusters = r.clusters
        .map((c) => `${Math.round(c.hue)}° ${(c.share * 100).toFixed(0)}%`)
        .join(" / ");
      const variants = VARIANTS.map((v) => {
        const pv = r.perVariant[v];
        return `<span class="vsw" style="background:${pv.hex}"></span>${v === "male" ? r.male : r.female} ${pv.hex}`;
      }).join("<br>");
      return `
  <tr>
    <td class="id">
      <div class="type">${r.typeId}</div>
      <div class="name">${r.male} / ${r.female}</div>
      <div class="dir">${r.dir}</div>
      <div class="tname">${r.typeName}</div>
    </td>
    <td class="imgs">
      <img src="${embedImage(r.dir, "male")}" alt="${r.male}">
      <img src="${embedImage(r.dir, "female")}" alt="${r.female}">
      ${
        r.diverged
          ? `<div class="warn">male/female で色が相違: ${
              r.variantHueDiff >= DIVERGENCE_DEG
                ? `色相が ${Math.round(r.variantHueDiff)}° 違う`
                : "色相は一致するが明度/彩度が違う"
            }(色差 ${Math.round(r.variantColorDiff)})。採用値は 2 枚をまとめた平均</div>`
          : ""
      }
      ${r.note ? `<div class="warn">${r.note}</div>` : ""}
      <div class="meta">${variants}</div>
      <div class="meta">採色レンジ ${r.hueRange[0]}〜${r.hueRange[1]}° / 採用 ${Math.round(r.dominantHue)}°(面積 ${(r.dominantShare * 100).toFixed(0)}%)</div>
      <div class="meta">レンジ無指定の自動選択(参考): ${r.autoHex ?? "-"}(${r.autoHue === null ? "-" : `${Math.round(r.autoHue)}°`}) / 主な色相帯 ${clusters}</div>
    </td>
    <td class="cur">
      <div class="sw" style="background:${cur?.primary ?? "#ccc"}"></div>
      <code>${cur?.primary ?? "-"}</code>
      <div class="sw" style="background:${cur?.accent ?? "#ccc"}"></div>
      <code>${cur?.accent ?? "-"}</code>
      <div class="btn" style="background:${cur?.accent ?? "#ccc"};color:${cur?.onAccent ?? "#fff"}">ボタン</div>
      <div class="meta">P ${curPrimaryContrast} / A ${curAccentContrast}</div>
    </td>
    <td class="new">
      <div class="sw" style="background:${r.primary}"></div>
      <code>${r.primary}</code>
      <div class="sw" style="background:${r.accent}"></div>
      <code>${r.accent}</code>
      <div class="btn" style="background:${r.accent};color:${r.onAccent}">ボタン</div>
      <div class="meta ${r.contrast >= AA_RATIO ? "ok" : "ng"}">
        白文字コントラスト ${r.contrast.toFixed(2)} ${r.contrast >= AA_RATIO ? "AA OK" : "NG"}
      </div>
      <div class="meta">primary 単体 ${r.primaryContrast.toFixed(2)}${
        r.accentAdjusted
          ? " / accent は色相・彩度を保ち明度のみ調整"
          : " / 調整なし(primary と同値)"
      }</div>
    </td>
    <td class="preview">
      <div class="card" style="--p:${r.primary};--a:${r.accent};--oa:${r.onAccent}">
        <div class="cardhead">今日の運勢</div>
        <div class="chip">吉方位 東</div>
        <a class="cta">詳しく見る</a>
      </div>
    </td>
  </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>キャラテーマカラー 抽出結果(確認用)</title>
<style>
  body { font-family: "Segoe UI", "Yu Gothic UI", sans-serif; margin: 24px; color: #1f2430; background: #fff; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .lead { font-size: 13px; color: #55607a; margin: 0 0 20px; line-height: 1.7; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #dfe3ec; padding: 10px; vertical-align: top; font-size: 12px; }
  th { background: #f4f6fb; font-size: 12px; text-align: left; }
  .id .type { font-size: 18px; font-weight: 700; }
  .id .name { font-size: 13px; margin-top: 2px; }
  .id .dir, .id .tname { color: #6b7385; margin-top: 4px; }
  .imgs img { width: 84px; height: auto; background: #fff; border: 1px solid #eee; border-radius: 6px; }
  .sw { width: 100%; height: 34px; border-radius: 6px; border: 1px solid rgba(0,0,0,.12); margin-bottom: 3px; }
  code { display: block; font-size: 12px; margin-bottom: 8px; }
  .btn { display: inline-block; padding: 7px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; }
  .meta { color: #6b7385; margin-top: 6px; line-height: 1.5; }
  .meta.ok { color: #1a7f4b; font-weight: 700; }
  .meta.ng { color: #c02626; font-weight: 700; }
  .warn { color: #b45309; font-weight: 700; margin-top: 6px; line-height: 1.5; }
  .vsw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(0,0,0,.2); margin-right: 5px; vertical-align: -2px; }
  td.cur, td.new { width: 160px; }
  td.imgs { width: 290px; }
  .card { border: 1px solid color-mix(in srgb, var(--a) 35%, #fff); border-radius: 10px; padding: 12px; background: color-mix(in srgb, var(--a) 8%, #fff); width: 190px; }
  .cardhead { font-weight: 700; color: var(--a); font-size: 14px; }
  .chip { display: inline-block; margin: 8px 0; padding: 4px 10px; border-radius: 999px; background: var(--p); color: #1f2430; font-size: 11px; }
  .cta { display: block; text-align: center; padding: 9px; border-radius: 8px; background: var(--a); color: var(--oa); font-weight: 700; }
</style>
</head>
<body>
<h1>キャラテーマカラー 抽出結果(P-A 確認用)</h1>
<p class="lead">
  各キャラの male / female 画像(計 24 枚)から識別色を抽出した結果です。
  primary は<strong>そのキャラの識別部位(髪・上着)の色相帯にある高彩度画素の平均</strong>、
  accent は primary の<strong>色相・彩度を保ったまま明度だけを下げて</strong>白文字 WCAG AA(4.5)を満たすようにした値です
  (色そのものは必ず画像の画素から算出しており、独自の色は使っていません)。<br>
  白背景・線画・肌色は画素レベルで除外しています。<br>
  「現行(プレースホルダ)」と「新(抽出)」を並べています。承認する場合はそのままお伝えください。
</p>
<table>
  <thead>
    <tr>
      <th>タイプ</th><th>キャラ画像</th><th>現行(プレースホルダ)</th><th>新(画像抽出)</th><th>UI プレビュー</th>
    </tr>
  </thead>
  <tbody>${rows}
  </tbody>
</table>
</body>
</html>`;
}

function buildSnippet(results) {
  const lines = results.map((r) => {
    const comment = `  // ${r.male}/${r.female}(${r.dir}) 識別色相 ${Math.round(r.dominantHue)}° / 白文字コントラスト ${r.contrast.toFixed(2)}`;
    const entry = `  "${r.typeId}": { primary: "${r.primary}", accent: "${r.accent}", onAccent: "${r.onAccent}" },`;
    return `${comment}\n${entry}`;
  });
  return `export const CHARACTER_THEME_SEED: Readonly<Record<PotentialTypeId, CharacterThemeSeed>> = {\n${lines.join("\n")}\n};`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i]?.startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = loadCharacterMap();
  const currentSeed = loadCurrentSeed();

  if (entries.length !== 12) {
    console.error(`[extract-colors] CHARACTER_MAP の解析に失敗しました (${entries.length} 件)`);
    process.exit(1);
  }

  // 1st pass: 24 枚をデコードして画素セットと色相分布を作る
  const loaded = [];
  const failures = [];
  for (const entry of entries) {
    try {
      const images = {};
      for (const variant of VARIANTS) {
        images[variant] = analyzeImageFile(join(CHAR_ASSET_DIR, entry.dir, `${variant}.webp`));
      }
      loaded.push({ entry, images });
      console.log(`[extract-colors] 読込 ${entry.typeId} ${entry.dir}`);
    } catch (e) {
      failures.push({ entry, message: e.message });
      console.error(`[extract-colors] 失敗 ${entry.typeId} ${entry.dir}: ${e.message}`);
    }
  }

  // 全キャラ共通色(肌・髪の茶など)のベースライン = 12 キャラの中央値
  const baseHist = medianHistogram(
    loaded.map((c) => meanHistogram(VARIANTS.map((v) => c.images[v].hist))),
  );

  // 2nd pass: キャラ固有の識別色を決める
  const results = [];
  for (const { entry, images } of loaded) {
    try {
      results.push(analyzeCharacter(entry, images, baseHist));
    } catch (e) {
      failures.push({ entry, message: e.message });
      console.error(`[extract-colors] 失敗 ${entry.typeId} ${entry.dir}: ${e.message}`);
    }
  }

  if (args.debug) {
    const targets = loaded.filter(
      (c) => args.debug === "all" || c.entry.typeId === args.debug || c.entry.dir === args.debug,
    );
    for (const target of targets) {
      const charHist = meanHistogram(VARIANTS.map((v) => target.images[v].hist));
      const rows = charHist
        .map((_, i) => ({
          hue: (i + 0.5) * (360 / HUE_BINS),
          share: windowShare(charHist, i),
          base: windowShare(baseHist, i),
        }))
        .map((r) => ({ ...r, ratio: r.share / (r.base + 1e-6) }))
        .sort((a, b) => b.share - a.share);
      // 近い色相帯の重複を間引く
      const picked = [];
      for (const row of rows) {
        if (picked.some((p) => hueDistance(p.hue, row.hue) < 30)) continue;
        picked.push(row);
        if (picked.length >= 6) break;
      }
      console.log(`\n=== debug ${target.entry.typeId} ${target.entry.dir} ===`);
      for (const row of picked.sort((a, b) => b.ratio - a.ratio)) {
        const rep = representativeColor(
          VARIANTS.map((v) => target.images[v].pixels),
          row.hue,
        );
        console.log(
          `hue ${String(Math.round(row.hue)).padStart(3)}°  share ${(row.share * 100).toFixed(1).padStart(5)}%  base ${(row.base * 100).toFixed(1).padStart(5)}%  ratio ${row.ratio.toFixed(2).padStart(6)}  ${rep?.hex ?? "-"}`,
        );
      }
    }
  }

  console.log("\n=== 抽出結果 ===");
  for (const r of results) {
    const cur = currentSeed[r.typeId];
    console.log(
      [
        r.typeId.padEnd(4),
        r.dir.padEnd(12),
        `primary ${r.primary}`,
        `accent ${r.accent}`,
        `contrast ${r.contrast.toFixed(2)}`,
        `hue ${String(Math.round(r.dominantHue)).padStart(3)}°`,
        `share ${(r.dominantShare * 100).toFixed(0)}%`,
        cur ? `(現行 ${cur.primary}/${cur.accent})` : "",
        r.diverged ? `[male/female 色相差 ${Math.round(r.variantHueDiff)}°]` : "",
      ].join("  "),
    );
  }

  const belowAa = results.filter((r) => r.contrast < AA_RATIO);
  console.log(
    `\nWCAG AA(>=${AA_RATIO}) 不足: ${belowAa.length} 件${
      belowAa.length ? ` -> ${belowAa.map((r) => r.typeId).join(", ")}` : ""
    }`,
  );

  console.log("\n=== 貼り付け用 ===\n");
  console.log(buildSnippet(results));

  if (args.json) {
    writeFileSync(resolve(args.json), `${JSON.stringify(results, null, 2)}\n`, "utf8");
    console.log(`\n[extract-colors] JSON を書き出しました: ${resolve(args.json)}`);
  }
  if (args.html) {
    writeFileSync(resolve(args.html), buildHtml(results, currentSeed), "utf8");
    console.log(`[extract-colors] 色見本 HTML を書き出しました: ${resolve(args.html)}`);
  }

  if (failures.length > 0) {
    console.error(`\n[extract-colors] 失敗 ${failures.length} 件`);
    for (const f of failures) {
      console.error(`  - ${f.entry.typeId} ${f.entry.dir}: ${f.message}`);
    }
    process.exit(1);
  }
}

main();
