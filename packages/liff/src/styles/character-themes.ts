import type { PotentialTypeId } from "@mj/engine";
import { vars } from "./theme.css";

/**
 * ============================================================================
 * キャラテーマ色の単一集約(P-A で実 HEX に差し替える唯一のファイル)
 * ============================================================================
 *
 * 出典 = Claude Design `docs/design-plan-A.md` §2-3(2026-07-31 人間承認)。
 *
 * 計画書の提案 hex をそのまま使うと 12 中 6 色が紙 #FAF7F1 上で AA(4.5:1)に届かない
 * (光 3.28 / 風 3.67 / 霧 4.17 / 虹 4.19 / 露 3.17 / 朝陽 3.57)。これは計画書の欠陥では
 * なく、計画書自身が §2-2 で次のように定めているため:
 *
 *   「淡いキャラ(露=#5C93A8)も濃いキャラ(月=#3A4B7A)も、"文字/線に使う --accent" は
 *     必ず paper 上で AA を満たす深さに正規化する。生の『淡い水色』をそのまま線に使わない。」
 *
 * よって下表は、計画書の提案 hex を**色相・彩度を保ったまま明度のみ下げて AA 化**した
 * 値である(色相のずれは最大 1°)。docs/06「独自の色を発明しない」にも整合する。
 * 全 12 色が紙上・白面ともに AA を満たすことを実測済み(最小 4.51)。
 * ★色を変えるときは必ずコントラストを再計算すること。
 *
 * 各シードは 3 値:
 *   - primary : 計画書の accentWash。**気配専用の淡い面(文字を絶対に載せない)**
 *   - accent  : 線・見出し・アイコン・塗りボタン。紙の上で白文字 AA
 *   - onAccent: accent 上の文字色
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
 *
 */
export interface CharacterThemeSeed {
  /** 識別色(明るめ)。ラベル・装飾用 */
  readonly primary: string;
  /** UI アクセント(線・見出し・アイコン・塗りボタン)。紙の上で白文字 AA */
  readonly accent: string;
  /** accent 上の文字色 */
  readonly onAccent: string;
}

export const CHARACTER_THEME_SEED: Readonly<Record<PotentialTypeId, CharacterThemeSeed>> = {
  // 光 — 提案 #B0810F(紙上 3.28)を正規化。色相 42°→43°
  "IR+": { primary: "#F6E7B8", accent: "#926b0c", onAccent: "#ffffff" },
  // 月 — 提案 #3A4B7A は紙上 7.96 だが、他キャラと濃さを揃えるため同じ規則で正規化
  "IR-": { primary: "#DDE3F0", accent: "#576faf", onAccent: "#ffffff" },
  // 風 — 提案 #4E8D6B(3.67)を正規化。色相 148° 保持
  "IL+": { primary: "#D8ECE0", accent: "#457d5f", onAccent: "#ffffff" },
  // 霧 — 提案 #7C7488(4.17)を正規化。色相 264°→265°
  "IL-": { primary: "#E7E3EC", accent: "#766e81", onAccent: "#ffffff" },
  // 炎 — 提案 #C6482B(4.50)。ほぼそのまま(色相 11° 保持)
  "PR+": { primary: "#F6DAC9", accent: "#c5482b", onAccent: "#ffffff" },
  // 滝 — 提案 #1F7A80(4.73)。色相 184° 保持
  "PR-": { primary: "#CFE6E6", accent: "#207d83", onAccent: "#ffffff" },
  // 山 — 提案 #4F6B3E(5.60)。色相 97°→98°
  "PL+": { primary: "#DCE4D2", accent: "#597946", onAccent: "#ffffff" },
  // 岩 — 提案 #7A6A52(4.90)。色相 36° 保持
  "PL-": { primary: "#E7E0D3", accent: "#806f56", onAccent: "#ffffff" },
  // 虹 — 提案 #7E6BB8(4.19)を正規化。色相 255° 保持(七色パステルの代表=プリズム紫)
  "ER+": { primary: "#ECE6F3", accent: "#7864b5", onAccent: "#ffffff" },
  // 露 — 提案 #5C93A8(3.17)を正規化。色相 197° 保持
  "ER-": { primary: "#E1EEF2", accent: "#4a788a", onAccent: "#ffffff" },
  // 朝陽 — 提案 #C56A3E(3.57)を正規化。色相 20°→19°
  "EL+": { primary: "#F7DEC9", accent: "#ad5b34", onAccent: "#ffffff" },
  // 湖 — 提案 #2C6E6A(5.54)。色相 176° 保持
  "EL-": { primary: "#CFE3DF", accent: "#327c77", onAccent: "#ffffff" },
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
    // 気配専用の淡い面(デザイン計画書 §2-2 --accent-wash)。
    // ヘッダーのグラデ・選択状態の地にのみ使い、**文字を載せない**。
    // そのため濃さは「紙との差がかろうじて分かる」程度でよく、
    // 淡色キャラでもコントラスト事故が起きない。
    [vars.color.accentWash]: mixWhite(accent, 0.82),
    [vars.color.accentSubtle]: mixWhite(accent, 0.9),
    [vars.color.accentSubtleStrong]: mixWhite(accent, 0.84),
    [vars.color.accentBorder]: mixWhite(accent, 0.62),
    [vars.color.accentBorderStrong]: mixWhite(accent, 0.45),
    [vars.color.onAccent]: onAccent,
    [vars.color.accentFocusRing]: rgba(accent, 0.14),
  };
}
