import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

/**
 * 方位盤(羅針盤)レイアウトのスタイル。
 *
 * - 3×3 のグリッドに、実際の方角と同じ位置で 8 方位 + 中宮を並べる(北が上)。
 * - セルは aspect-ratio: 1 の正方形。4 隅のセルだけ外側の角を大きく丸め、
 *   全体が「円盤(ダイヤル)」に近いシルエットに見えるようにする。
 * - 色は意味色トークン経由。凶はグレー系(dirMisfortune*)で、方位マップの
 *   グレー(#6b7280 系)と揃える。エラー表示の赤(misfortune*)とは別系統。
 */

// 盤全体を 1 枚のカードに載せる(運勢カードと同じ流儀)
// 影は使わず罫線で面を区切る(デザイン計画書 §5)
export const card = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.md,
  marginBottom: vars.space.md,
});

// 「上が北」であることの明示(方位盤は回転しない)
export const northNote = style({
  fontSize: "10px",
  letterSpacing: "0.08em",
  color: vars.color.textMuted,
  textAlign: "center",
  marginBottom: "6px",
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "6px",
});

// セル共通。DOM の並び順がそのまま視覚上の並び(NW,N,NE / W,中宮,E / SW,S,SE)。
export const cell = style({
  aspectRatio: "1 / 1",
  minWidth: 0,
  borderRadius: vars.radius.sm,
  padding: "6px 4px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "1px",
  overflow: "hidden",
});

/**
 * タップで詳細モーダルを開くセル(interactive 時)。
 * 見た目は非対話のセルと同じにし、「押せる」ことは押下時の縮みとフォーカスリングで示す。
 * タップ領域はセルそのもの(3 列グリッドの正方形 ≒ 100px)なので 44px を満たす。
 */
export const cellButton = style({
  width: "100%",
  appearance: "none",
  fontFamily: "inherit",
  color: "inherit",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  transition: "transform 120ms ease",
  selectors: {
    "&:active": { transform: "scale(0.97)" },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px ${vars.color.accentFocusRing}`,
    },
  },
});

// 4 隅の外側の角を大きく丸め、盤らしいシルエットにする
export const corner = styleVariants({
  NW: { borderTopLeftRadius: "40px" },
  NE: { borderTopRightRadius: "40px" },
  SW: { borderBottomLeftRadius: "40px" },
  SE: { borderBottomRightRadius: "40px" },
});

// ── 吉凶の配色(トークン経由。ハードコード色なし) ──────────────

export const cellGreat = style({
  backgroundColor: vars.color.fortuneGreatBg,
  border: `1px solid ${vars.color.fortuneGreatBorder}`,
});

export const cellFortune = style({
  backgroundColor: vars.color.fortuneBg,
  border: `1px solid ${vars.color.fortuneBorder}`,
});

export const cellNeutral = style({
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
});

// 凶 = グレー。中立(surfaceSubtle / border)より濃くして見分けられるようにする。
export const cellMisfortune = style({
  backgroundColor: vars.color.dirMisfortuneBg,
  border: `1px solid ${vars.color.dirMisfortuneBorder}`,
});

// ── セルの中身 ─────────────────────────────────────────────

// 方位名は羅針盤の主役なので大きめ
export const dirLabel = style({
  fontSize: "15px",
  fontWeight: 700,
  lineHeight: 1.2,
  color: vars.color.text,
});

export const star = style({
  fontSize: "10px",
  lineHeight: 1.3,
  color: vars.color.textMuted,
});

export const badgeGood = style({
  fontSize: "10px",
  fontWeight: 700,
  lineHeight: 1.2,
  color: vars.color.fortuneText,
});

// 凶ラベルもグレー。長い場合は折り返す(情報は省略しない)。
export const badgeBad = style({
  fontSize: "9px",
  fontWeight: 700,
  lineHeight: 1.25,
  color: vars.color.dirMisfortuneText,
  wordBreak: "break-word",
});

// ── 中央(中宮) ────────────────────────────────────────────

// 羅針盤の中心らしく円形。
// 背景は面色のまま(アクセントで塗ると吉=緑のセルと紛らわしくなるため)。
// 「盤の軸」であることは円形 + アクセントのリングで示す。
export const centerCell = style({
  aspectRatio: "1 / 1",
  minWidth: 0,
  borderRadius: "50%",
  padding: "6px 2px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "2px",
  overflow: "hidden",
  backgroundColor: vars.color.surface,
  border: `2px solid ${vars.color.accentBorderStrong}`,
});

// 中宮の値が無い盤(月盤・年盤)は中心の目印だけを置く
export const centerCellEmpty = style([
  centerCell,
  {
    backgroundColor: "transparent",
    border: `2px dashed ${vars.color.border}`,
  },
]);

export const centerLabel = style({
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: vars.color.accent,
});

export const centerValue = style({
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.2,
  color: vars.color.text,
});

export const centerDot = style({
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  border: `2px solid ${vars.color.border}`,
});
