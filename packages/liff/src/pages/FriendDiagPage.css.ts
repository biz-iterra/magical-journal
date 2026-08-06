import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── レイアウト ─────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const pageTitle = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.title,
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
  borderRadius: vars.radius.lg,
  padding: "20px",
  marginBottom: "16px",
  border: `1px solid ${vars.color.border}`,
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
  borderRadius: vars.radius.sm,
  backgroundColor: vars.color.surface,
  color: vars.color.text,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b655c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
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
  borderRadius: vars.radius.sm,
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
  borderRadius: vars.radius.md,
  cursor: "pointer",
  marginTop: "8px",
  ":disabled": {
    color: vars.color.textDisabled,
    backgroundColor: vars.color.surfaceMuted,
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
  borderRadius: vars.radius.md,
  padding: "16px 20px",
  marginBottom: "10px",
  border: `1px solid ${vars.color.border}`,
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
  borderRadius: vars.radius.lg,
  padding: "24px 20px",
  marginBottom: "12px",
  border: `1px solid ${vars.color.border}`,
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
  fontFamily: vars.font.heading,
  fontSize: "28px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.2,
  marginBottom: "4px",
});

export const typeNameLarge = style({
  fontFamily: vars.font.heading,
  fontSize: "15px",
  fontWeight: 500,
  color: vars.color.textSecondary,
});

export const resultCharName = style({
  fontSize: "13px",
  color: vars.color.accent,
  marginTop: "4px",
});

// ── AI占い(事前生成レポートの静的読み込み) ──────────────
// 体裁はマイタイプの AI占い(MyTypePage.css.ts)に合わせる。

export const aiButton = style({
  width: "100%",
  padding: "14px 20px",
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  border: "none",
  borderRadius: vars.radius.md,
  cursor: "pointer",
  marginBottom: "12px",
  ":active": {
    backgroundColor: vars.color.accentStrong,
  },
  ":disabled": {
    opacity: 0.6,
    cursor: "default",
  },
});

export const aiButtonSub = style({
  display: "block",
  fontSize: "11px",
  fontWeight: 500,
  color: vars.color.onAccent,
  opacity: 0.85,
  marginTop: "2px",
});

export const reportCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  padding: "20px",
  marginBottom: "12px",
  border: `1px solid ${vars.color.border}`,
});

export const reportBadge = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.accent,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
});

export const reportTitle = style({
  fontFamily: vars.font.heading,
  fontSize: "18px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.3,
});

export const reportSubtitle = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginTop: "2px",
  marginBottom: "16px",
});

export const reportItem = style({
  selectors: {
    "& + &": {
      marginTop: "16px",
      paddingTop: "16px",
      borderTop: `1px solid ${vars.color.borderHairline}`,
    },
  },
});

export const reportItemLabel = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.color.accent,
  marginBottom: "6px",
});

export const reportItemText = style({
  fontSize: "14px",
  lineHeight: 1.7,
  color: vars.color.textBody,
  whiteSpace: "pre-wrap",
});

export const reportEmpty = style({
  fontSize: "13px",
  lineHeight: 1.7,
  color: vars.color.textMuted,
  textAlign: "center",
  padding: "12px 4px",
});

export const reportErrorText = style({
  fontSize: "13px",
  color: vars.color.misfortuneText,
  textAlign: "center",
  padding: "8px 4px",
});

export const reportRetryRow = style({
  marginTop: "14px",
  paddingTop: "14px",
  borderTop: `1px solid ${vars.color.borderHairline}`,
  display: "flex",
  justifyContent: "center",
});

export const reportRetryButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "7px 16px",
  fontSize: "12px",
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  ":active": {
    backgroundColor: vars.color.surfaceMuted,
  },
  ":disabled": {
    opacity: 0.6,
    cursor: "default",
  },
});

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

export const reportLoadingWrap = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  padding: "16px 4px",
});

export const spinner = style({
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  border: `3px solid ${vars.color.accentSubtleStrong}`,
  borderTopColor: vars.color.accent,
  animation: `${spin} 0.8s linear infinite`,
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
  borderRadius: vars.radius.sm,
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

// プライバシーの説明は「読ませる」文なので、非活性色ではなく AA を満たす弱文字にする
export const privacyNote = style({
  fontSize: "11px",
  color: vars.color.textMuted,
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
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  marginTop: "8px",
  ":active": {
    backgroundColor: vars.color.border,
  },
});
