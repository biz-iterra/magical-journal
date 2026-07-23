import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── ページ全体 ────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const pageTitle = style({
  fontSize: "18px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "16px",
});

// ── ローディング / エラー ──────────────────────────────────

export const loadingWrap = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40dvh",
  color: vars.color.textMuted,
  fontSize: "14px",
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

// ── メインカード(ポテンシャルタイプ) ─────────────────────

export const mainCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "24px 20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const mainCardLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.accent,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "8px",
});

export const typeCodeLarge = style({
  fontSize: "32px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.2,
  marginBottom: "4px",
});

export const typeNameLarge = style({
  fontSize: "16px",
  fontWeight: 500,
  color: vars.color.textSecondary,
  marginBottom: "12px",
});

export const characterName = style({
  fontSize: "14px",
  color: vars.color.accent,
  fontWeight: 500,
});

// ── ハイブリッド表示 ──────────────────────────────────────

export const hybridRow = style({
  display: "flex",
  gap: "12px",
  marginBottom: "12px",
});

export const hybridPrimary = style({
  flex: 2,
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "20px 16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const hybridSecondary = style({
  flex: 1,
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "16px 12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
});

export const hybridLabel = style({
  fontSize: "10px",
  fontWeight: 600,
  color: vars.color.accent,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "6px",
});

export const hybridCodeSmall = style({
  fontSize: "20px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.2,
  marginBottom: "2px",
});

export const hybridNameSmall = style({
  fontSize: "12px",
  color: vars.color.textMuted,
});

// 副キャラ名(ハイブリッドの小カード)
export const hybridCharName = style({
  fontSize: "11px",
  color: vars.color.accent,
  marginTop: "4px",
});

// ── キャラ画像プレースホルダ ──────────────────────────────

export const charImage = style({
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  objectFit: "cover",
  objectPosition: "top",
  backgroundColor: vars.color.accentSubtle,
  marginBottom: "12px",
});

export const charImageSmall = style({
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  objectFit: "cover",
  objectPosition: "top",
  backgroundColor: vars.color.accentSubtle,
  marginBottom: "8px",
});

export const charPlaceholder = style({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  backgroundColor: vars.color.accentSubtle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "12px",
  fontSize: "13px",
  color: vars.color.accentBorderStrong,
  fontWeight: 500,
});

export const charPlaceholderSmall = style({
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: vars.color.accentSubtle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "8px",
  fontSize: "10px",
  color: vars.color.accentBorderStrong,
  fontWeight: 500,
});

// ── サブカード(共通) ─────────────────────────────────────

export const card = style({
  backgroundColor: vars.color.surface,
  borderRadius: "12px",
  padding: "16px 20px",
  marginBottom: "10px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
});

export const cardLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.textFaint,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: "6px",
});

export const cardValue = style({
  fontSize: "18px",
  fontWeight: 600,
  color: vars.color.text,
});

export const cardSub = style({
  fontSize: "13px",
  color: vars.color.textMuted,
  marginTop: "2px",
});

// ── マスターナンバーバッジ ──────────────────────────────

export const masterBadge = style({
  display: "inline-block",
  fontSize: "10px",
  fontWeight: 600,
  color: vars.color.warningText,
  backgroundColor: vars.color.warningBg,
  border: `1px solid ${vars.color.warningBorder}`,
  borderRadius: "4px",
  padding: "2px 6px",
  marginLeft: "8px",
  verticalAlign: "middle",
});
