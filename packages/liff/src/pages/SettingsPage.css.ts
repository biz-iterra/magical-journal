import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const container = style({
  paddingBottom: "80px",
});

export const pageTitle = style({
  fontSize: "20px",
  fontWeight: 700,
  color: vars.color.text,
  margin: "8px 0 20px",
});

export const section = style({
  backgroundColor: vars.color.surface,
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
});

export const sectionLabel = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.color.accent,
  marginBottom: "10px",
});

export const readonlyValue = style({
  fontSize: "15px",
  color: vars.color.textBody,
});

export const readonlyNote = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  marginTop: "4px",
});

export const selectRow = style({
  display: "flex",
  gap: "8px",
});

export const select = style({
  flex: 1,
  appearance: "none",
  padding: "10px 12px",
  fontSize: "15px",
  color: vars.color.text,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "10px",
  outline: "none",
});

export const input = style({
  width: "100%",
  padding: "10px 12px",
  fontSize: "15px",
  color: vars.color.text,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "10px",
  outline: "none",
  boxSizing: "border-box",
  selectors: {
    "&:focus": { borderColor: vars.color.accent },
  },
});

export const hint = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  marginTop: "6px",
});

export const styleChoices = style({
  display: "flex",
  gap: "12px",
});

export const styleCard = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "14px 8px",
  backgroundColor: vars.color.surfaceSubtle,
  border: `2px solid ${vars.color.border}`,
  borderRadius: "12px",
  cursor: "pointer",
});

export const styleCardSelected = style({
  borderColor: vars.color.accent,
  backgroundColor: vars.color.accentSubtle,
});

export const styleCardImage = style({
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  objectFit: "cover",
  objectPosition: "top",
  marginBottom: "8px",
});

export const styleCardLabel = style({
  fontSize: "14px",
  fontWeight: 600,
  color: vars.color.text,
});

export const styleCardDesc = style({
  fontSize: "11px",
  color: vars.color.textMuted,
  marginTop: "2px",
});

export const saveBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
  backgroundColor: vars.color.overlaySaveBar,
  borderTop: `1px solid ${vars.color.borderHairline}`,
  backdropFilter: "blur(8px)",
});

export const saveButton = style({
  width: "100%",
  padding: "14px",
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.5 },
  },
});

export const banner = style({
  padding: "10px 12px",
  borderRadius: "10px",
  fontSize: "13px",
  marginBottom: "14px",
});

export const bannerError = style({
  backgroundColor: vars.color.misfortuneBg,
  color: vars.color.misfortuneText,
});

export const bannerSuccess = style({
  backgroundColor: vars.color.successBg,
  color: vars.color.fortuneText,
});

export const loadingWrap = style({
  textAlign: "center",
  padding: "40px 0",
  color: vars.color.textMuted,
});
