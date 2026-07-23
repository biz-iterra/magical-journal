import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── ページ全体 ────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const dateHeader = style({
  fontSize: "14px",
  color: vars.color.textMuted,
  marginBottom: "4px",
});

export const pageTitle = style({
  fontSize: "20px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "16px",
});

// ── ローディング / エラー ──────────────────────────────────

export const loadingWrap = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40dvh",
  gap: "14px",
  color: vars.color.textMuted,
  fontSize: "14px",
});

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

// アクセント色のスピナー(初回アクセスは同期生成で数秒〜十数秒かかりうる)
export const spinner = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: `3px solid ${vars.color.accentSubtleStrong}`,
  borderTopColor: vars.color.accent,
  animation: `${spin} 0.8s linear infinite`,
});

export const loadingText = style({
  fontSize: "13px",
  color: vars.color.textMuted,
  textAlign: "center",
});

export const errorWrap = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40dvh",
  gap: "12px",
  padding: "20px",
});

export const errorText = style({
  fontSize: "14px",
  color: vars.color.misfortuneText,
  textAlign: "center",
});

export const retryButton = style({
  padding: "8px 20px",
  fontSize: "14px",
  fontWeight: 500,
  color: vars.color.accent,
  backgroundColor: vars.color.accentSubtle,
  border: `1px solid ${vars.color.accentBorder}`,
  borderRadius: "8px",
  cursor: "pointer",
  ":active": {
    backgroundColor: vars.color.accentSubtleStrong,
  },
});

// ── 運勢テキストカード ───────────────────────────────────

export const fortuneCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const fortuneText = style({
  fontSize: "14px",
  lineHeight: 1.7,
  color: vars.color.textBody,
  whiteSpace: "pre-wrap",
});

export const fortuneEmpty = style({
  fontSize: "13px",
  color: vars.color.textFaint,
  textAlign: "center",
  padding: "12px 0",
});

// ── 運勢3セクション(運勢 / スケジュール / キャラの一言) ─────
// 1枚のカード内に3セクションを縦積みし、セクション間は極薄の仕切りで区切る。

// 2番目以降のセクションに上マージン + 上罫線を付ける
export const fortuneSection = style({
  selectors: {
    "& + &": {
      marginTop: "16px",
      paddingTop: "16px",
      borderTop: `1px solid ${vars.color.borderHairline}`,
    },
  },
});

export const fortuneSectionTitle = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.color.accent,
  marginBottom: "6px",
});

// キャラの一言セクションの見出し(アクセント色を少し弱める必要はないが、
// 内容がキャラのトーンであることを示すため本文をアクセント淡背景で括る)
export const fortuneCharBody = style({
  fontSize: "14px",
  lineHeight: 1.7,
  color: vars.color.textBody,
  whiteSpace: "pre-wrap",
  backgroundColor: vars.color.accentSubtle,
  borderRadius: "10px",
  padding: "12px 14px",
});

// ── 九星情報 ──────────────────────────────────────────────

export const starRow = style({
  display: "flex",
  gap: "10px",
  marginBottom: "12px",
});

export const starChip = style({
  flex: 1,
  backgroundColor: vars.color.surface,
  borderRadius: "10px",
  padding: "12px 14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
});

export const starChipLabel = style({
  fontSize: "10px",
  fontWeight: 600,
  color: vars.color.textFaint,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: "4px",
});

export const starChipValue = style({
  fontSize: "16px",
  fontWeight: 600,
  color: vars.color.text,
});

// ── 方位セクション ───────────────────────────────────────

export const sectionTitle = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.color.textSecondary,
  marginBottom: "8px",
  marginTop: "16px",
});

export const directionGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "6px",
  marginBottom: "12px",
});

export const dirCell = style({
  borderRadius: "8px",
  padding: "10px 4px",
  textAlign: "center",
  minHeight: "56px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "2px",
});

export const dirCellGreat = style({
  backgroundColor: vars.color.fortuneGreatBg,
  border: `1px solid ${vars.color.fortuneGreatBorder}`,
});

export const dirCellFortune = style({
  backgroundColor: vars.color.fortuneBg,
  border: `1px solid ${vars.color.fortuneBorder}`,
});

export const dirCellNeutral = style({
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
});

export const dirCellMisfortune = style({
  backgroundColor: vars.color.misfortuneBg,
  border: `1px solid ${vars.color.misfortuneBorder}`,
});

export const dirLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.textSecondary,
});

export const dirStar = style({
  fontSize: "10px",
  color: vars.color.textMuted,
});

export const dirBadge = style({
  fontSize: "9px",
  fontWeight: 600,
  color: vars.color.misfortuneText,
  marginTop: "2px",
  lineHeight: 1.2,
});

export const dirBadgeGood = style({
  fontSize: "9px",
  fontWeight: 600,
  color: vars.color.fortuneText,
  marginTop: "2px",
});

// ── タブ切替 ──────────────────────────────────────────────

export const tabRow = style({
  display: "flex",
  gap: "4px",
  marginBottom: "12px",
  backgroundColor: vars.color.surfaceMuted,
  borderRadius: "10px",
  padding: "3px",
});

export const tab = style({
  flex: 1,
  padding: "8px 0",
  fontSize: "13px",
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s",
});

export const tabActive = style({
  backgroundColor: vars.color.surface,
  color: vars.color.text,
  fontWeight: 600,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
});

// ── 未登録 ────────────────────────────────────────────────

export const emptyCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "32px 20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  textAlign: "center",
});

export const emptyText = style({
  fontSize: "14px",
  color: vars.color.textMuted,
  marginBottom: "16px",
});

export const registerLink = style({
  display: "inline-block",
  padding: "10px 24px",
  fontSize: "14px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  borderRadius: "10px",
  textDecoration: "none",
  ":active": {
    backgroundColor: vars.color.accentStrong,
  },
});

// ── 方位マップ ──────────────────────────────────────────────

export const mapSection = style({
  marginTop: "16px",
});
