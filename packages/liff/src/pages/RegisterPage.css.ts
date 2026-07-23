import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── レイアウト ─────────────────────────────────────────────

export const container = style({
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: vars.color.bg,
});

export const header = style({
  padding: "24px 20px 0",
  textAlign: "center",
});

export const title = style({
  fontSize: "20px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "4px",
});

export const subtitle = style({
  fontSize: "13px",
  color: vars.color.textMuted,
  marginBottom: "20px",
});

// ── ステップインジケーター ─────────────────────────────────

export const stepIndicator = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  padding: "0 20px 20px",
});

export const stepDot = style({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: vars.color.borderInput,
  transition: "background-color 0.2s, transform 0.2s",
});

export const stepDotActive = style({
  backgroundColor: vars.color.accent,
  transform: "scale(1.3)",
});

export const stepDotDone = style({
  backgroundColor: vars.color.accentBorderStrong,
});

export const stepLabel = style({
  fontSize: "12px",
  color: vars.color.textFaint,
  marginLeft: "4px",
});

// ── フォーム ──────────────────────────────────────────────

export const formArea = style({
  flex: 1,
  padding: "0 20px",
});

export const fieldGroup = style({
  marginBottom: "20px",
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

export const selectWrapper = style({
  position: "relative",
  flex: 1,
});

export const select = style({
  width: "100%",
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

export const selectPlaceholder = style({
  color: vars.color.textDisabled,
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

export const romajiPreview = style({
  marginTop: "8px",
  padding: "10px 14px",
  fontSize: "14px",
  color: vars.color.textSecondary,
  backgroundColor: vars.color.surfaceMuted,
  borderRadius: "8px",
  letterSpacing: "0.05em",
  wordBreak: "break-all",
});

export const romajiNote = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  marginTop: "4px",
});

// ── キャラスタイル選択 ──────────────────────────────────────

export const styleChoices = style({
  display: "flex",
  gap: "12px",
});

export const styleCard = style({
  flex: 1,
  padding: "20px 16px",
  borderRadius: "12px",
  border: `2px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
  textAlign: "center",
  cursor: "pointer",
  transition: "border-color 0.15s, box-shadow 0.15s",
  minHeight: "48px",
  ":active": {
    transform: "scale(0.98)",
  },
});

export const styleCardSelected = style({
  borderColor: vars.color.accent,
  boxShadow: `0 0 0 3px ${vars.color.accentFocusRing}`,
});

export const styleCardLabel = style({
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "4px",
});

export const styleCardDesc = style({
  fontSize: "12px",
  color: vars.color.textMuted,
});

// ── ボタン群 ──────────────────────────────────────────────

export const buttonArea = style({
  padding: "16px 20px",
  paddingBottom: "max(16px, env(safe-area-inset-bottom))",
  display: "flex",
  gap: "10px",
});

export const backButton = style({
  height: "48px",
  padding: "0 20px",
  fontSize: "15px",
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: vars.color.surfaceMuted,
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  ":active": {
    backgroundColor: vars.color.border,
  },
});

export const nextButton = style({
  flex: 1,
  height: "48px",
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  ":disabled": {
    backgroundColor: vars.color.accentBorder,
    cursor: "not-allowed",
  },
  ":active": {
    backgroundColor: vars.color.accentStrong,
  },
});

// ── エラー ────────────────────────────────────────────────

export const errorBanner = style({
  margin: "0 20px 16px",
  padding: "12px 14px",
  fontSize: "13px",
  color: vars.color.misfortuneText,
  backgroundColor: vars.color.misfortuneBg,
  borderRadius: "8px",
  border: `1px solid ${vars.color.misfortuneBorder}`,
});

// ── 送信中オーバーレイ ──────────────────────────────────────

export const submittingOverlay = style({
  position: "fixed",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: vars.color.overlayScrim,
  zIndex: 100,
  fontSize: "15px",
  color: vars.color.textSecondary,
});
