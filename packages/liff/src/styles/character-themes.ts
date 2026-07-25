import type { PotentialTypeId } from "@mj/engine";
import { vars } from "./theme.css";

/**
 * ============================================================================
 * キャラテーマ色の単一集約(P-A で実 HEX に差し替える唯一のファイル)
 * ============================================================================
 *
 * P-A 確定済み(2026-07-26 人間承認)。下表が確定値。
 *
 * 決め方(docs/06「独自の色を発明しない」を守るため、色は必ず出典を持つ):
 *   - 原則: キャラ画像(24枚)から識別色を抽出する(`scripts/extract-character-colors.mjs`)。
 *   - 例外【記述】: キャラ設定 appearance.yaml の色記述と実画像が食い違うキャラは、
 *     人間判断により**設定の記述を正**とし、記述由来の色を採用した(IR+ / IL+ / PR- / EL-)。
 *   - 例外【選択】: ER+(虹)はパステル多色で単色に定まらないため、人間が淡金系を選択。
 *     accent は primary の色相・彩度を保ったまま明度のみ下げて導出している。
 *   - accent は全て白文字で WCAG AA(コントラスト >= 4.5)を満たすことを実測で確認済み
 *     (各行末の AA 値。最小 4.55)。色を変える場合は必ず再計算すること。
 *
 * 各シードは 3 値のみ:
 *   - primary : キャラの識別色(明るめの主色。ラベル/装飾の将来利用・3-2 用)
 *   - accent  : UI アクセント(ボタン/リンク/アクティブ)。白文字 AA を満たす中〜濃色を採用
 *   - onAccent: accent 上の文字色(U4。現プレースホルダは全て白で AA を満たす)
 *
 * accent の派生シェード(subtle/border/strong/focusRing)は deriveAccentTheme() が
 * accent から算出する(集約対象を 3 値に保つため)。
 *
 * 出典対応(engine CHARACTER_MAP の directoryKey / appearance.yaml color_palette):
 *   IR+ 01-hikaru  光  クリーム〜淡橙   | IR- 02-tsukuyo 月  藍〜銀
 *   IL+ 03-kazema  風  若草〜ミント     | IL- 04-kiriya  霧  グレー〜モーブ
 *   PR+ 05-homura  炎  赤〜橙           | PR- 06-takito  滝  青緑〜ターコイズ
 *   PL+ 07-takane  山  深緑〜カーキ     | PL- 08-iwao    岩  茶〜グレージュ
 *   ER+ 09-nijika  虹  プラチナ〜虹色   | ER- 10-tsuyuha 露  淡水色〜銀
 *   EL+ 11-hinata  朝陽 橙〜桃          | EL- 12-kohaku  湖  藍緑〜翡翠
 */
export interface CharacterThemeSeed {
  /** 識別色(明るめ) — PLACEHOLDER: P-A で確定 HEX に差替 */
  readonly primary: string;
  /** UI アクセント(白文字 AA) — PLACEHOLDER: P-A で確定 HEX に差替 */
  readonly accent: string;
  /** accent 上の文字色 — PLACEHOLDER: P-A で AA 再確認 */
  readonly onAccent: string;
}

export const CHARACTER_THEME_SEED: Readonly<Record<PotentialTypeId, CharacterThemeSeed>> = {
  // 光 — やわらかい黄〜クリーム / 淡いオレンジ【記述】AA 4.65
  "IR+": { primary: "#f2c14e", accent: "#a56617", onAccent: "#ffffff" },
  // 月 — 深い藍〜紺 / 銀・淡い水色【画像】AA 9.55
  "IR-": { primary: "#3c4463", accent: "#3c4463", onAccent: "#ffffff" },
  // 風 — 若草色〜ミントグリーン / 淡い水色【記述】AA 4.64
  "IL+": { primary: "#7fc7a4", accent: "#268459", onAccent: "#ffffff" },
  // 霧 — くすんだグレー〜モーブ / 淡いブルーグレー【画像】AA 4.60
  "IL-": { primary: "#b79da4", accent: "#916b75", onAccent: "#ffffff" },
  // 炎 — 鮮やかな赤〜オレンジ / 明るいイエロー【画像】AA 4.63
  "PR+": { primary: "#ef3934", accent: "#e71812", onAccent: "#ffffff" },
  // 滝 — 深い青緑〜ターコイズ / 明るい水色【記述】AA 4.95
  "PR-": { primary: "#3fb0b8", accent: "#0e7c86", onAccent: "#ffffff" },
  // 山 — 深緑〜濃いカーキ / 岩のグレー【画像】AA 5.57
  "PL+": { primary: "#6a6a49", accent: "#6a6a49", onAccent: "#ffffff" },
  // 岩 — アースカラーの茶〜グレージュ / 苔の緑【画像】AA 4.63
  "PL-": { primary: "#c1a685", accent: "#8f6f49", onAccent: "#ffffff" },
  // 虹 — プラチナ+虹色 / 七色パステル(多色のため単色化。人間選択=淡金)【選択】AA 4.55
  "ER+": { primary: "#f7e3a3", accent: "#91720d", onAccent: "#ffffff" },
  // 露 — 透明感のある淡い水色〜シルバー / 淡いミント【画像】AA 4.61
  "ER-": { primary: "#a2b9d6", accent: "#4c77ae", onAccent: "#ffffff" },
  // 朝陽 — あたたかいオレンジ〜桃色 / やわらかい黄金色【画像】AA 4.60
  "EL+": { primary: "#e78e5d", accent: "#bf561c", onAccent: "#ffffff" },
  // 湖 — 静かな深い藍緑〜青 / 翡翠色【記述】AA 6.02
  "EL-": { primary: "#3e9c8f", accent: "#1f6e68", onAccent: "#ffffff" },
};

// ── 色ユーティリティ(依存ゼロ・純粋関数) ─────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("")}`;
}

/** hex を白へ ratio(0..1) 分だけ寄せる(1=白)。淡いアクセント背景・境界の生成に使う。 */
function mixWhite(hex: string, ratio: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex([r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio]);
}

/** hex を黒方向へ factor(0..1) 分だけ暗くする(押下時の濃色)。 */
function darken(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex([r * (1 - factor), g * (1 - factor), b * (1 - factor)]);
}

/** hex を rgba(alpha) 文字列にする(フォーカスリング用)。 */
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * シード(3値)から accent 系トークンの完全な値セットを導出する。
 * 返り値はキー=CSS 変数参照(vars.color.*)、値=実色。ネスト要素へ注入して
 * :root の既定(インディゴ)を上書きする。
 */
export function deriveCharacterThemeVars(typeId: PotentialTypeId): Record<string, string> {
  const seed = CHARACTER_THEME_SEED[typeId];
  const { accent, onAccent } = seed;
  return {
    [vars.color.accent]: accent,
    [vars.color.accentStrong]: darken(accent, 0.12),
    [vars.color.accentSubtle]: mixWhite(accent, 0.9),
    [vars.color.accentSubtleStrong]: mixWhite(accent, 0.84),
    [vars.color.accentBorder]: mixWhite(accent, 0.62),
    [vars.color.accentBorderStrong]: mixWhite(accent, 0.45),
    [vars.color.onAccent]: onAccent,
    [vars.color.accentFocusRing]: rgba(accent, 0.14),
  };
}
