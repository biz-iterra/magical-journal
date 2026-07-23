import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── レイアウト ─────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const pageTitle = style({
  fontSize: "18px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "4px",
});

export const pageSubtitle = style({
  fontSize: "13px",
  color: vars.color.textMuted,
  marginBottom: "20px",
});

// ── 入力フォーム ──────────────────────────────────────────

export const formCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const fieldGroup = style({
  marginBottom: "16px",
  selectors: {
    "&:last-child": {
      marginBottom: 0,
    },
  },
});

export const label = style({
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: vars.color.textSecondary,
  marginBottom: "6px",
});

export const requiredBadge = style({
  fontSize: "11px",
  color: vars.color.danger,
  marginLeft: "4px",
});

export const optionalBadge = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  marginLeft: "4px",
});

export const selectRow = style({
  display: "flex",
  gap: "8px",
});

export const select = style({
  flex: 1,
  height: "48px",
  padding: "0 32px 0 12px",
  fontSize: "16px",
  border: `1px solid ${vars.color.borderInput}`,
  borderRadius: "10px",
  backgroundColor: vars.color.surface,
  color: vars.color.text,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
  backgroundPosition: "right 8px center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "20px 20px",
  ":focus": {
    outline: "none",
    borderColor: vars.color.accent,
    boxShadow: `0 0 0 3px ${vars.color.accentFocusRing}`,
  },
});

export const input = style({
  width: "100%",
  height: "48px",
  padding: "0 14px",
  fontSize: "16px",
  border: `1px solid ${vars.color.borderInput}`,
  borderRadius: "10px",
  backgroundColor: vars.color.surface,
  color: vars.color.text,
  ":focus": {
    outline: "none",
    borderColor: vars.color.accent,
    boxShadow: `0 0 0 3px ${vars.color.accentFocusRing}`,
  },
  "::placeholder": {
    color: vars.color.textPlaceholder,
  },
});

export const inputHalf = style({
  flex: 1,
});

export const diagnoseButton = style({
  width: "100%",
  height: "48px",
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  marginTop: "8px",
  ":disabled": {
    backgroundColor: vars.color.accentBorder,
    cursor: "not-allowed",
  },
  ":active": {
    backgroundColor: vars.color.accentStrong,
  },
});

// ── 結果セクション ───────────────────────────────────────

export const resultSection = style({
  marginTop: "8px",
});

export const resultHeader = style({
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "12px",
});

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
  fontSize: "28px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.2,
  marginBottom: "4px",
});

export const typeNameLarge = style({
  fontSize: "15px",
  fontWeight: 500,
  color: vars.color.textSecondary,
});

export const resultCharName = style({
  fontSize: "13px",
  color: vars.color.accent,
  marginTop: "4px",
});

// ── 補助テキスト ──────────────────────────────────────────

export const fieldNote = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  marginTop: "4px",
});

// ── エラー ────────────────────────────────────────────────

export const errorBanner = style({
  padding: "12px 14px",
  fontSize: "13px",
  color: vars.color.misfortuneText,
  backgroundColor: vars.color.misfortuneBg,
  borderRadius: "8px",
  border: `1px solid ${vars.color.misfortuneBorder}`,
  marginBottom: "12px",
});

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

// ── 注意書き ──────────────────────────────────────────────

export const privacyNote = style({
  fontSize: "11px",
  color: vars.color.textDisabled,
  textAlign: "center",
  marginTop: "16px",
  lineHeight: 1.5,
});

// ── リセットボタン ───────────────────────────────────────

export const resetButton = style({
  width: "100%",
  height: "44px",
  fontSize: "14px",
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: vars.color.surfaceMuted,
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  marginTop: "8px",
  ":active": {
    backgroundColor: vars.color.border,
  },
});
