import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const container = style({
  // 固定の保存バーぶんの余白。下部ナビぶんは Layout の main が持っている
  paddingBottom: "84px",
});

export const pageTitle = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.title,
  fontWeight: 600,
  color: vars.color.text,
  margin: "8px 0 20px",
});

export const section = style({
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  padding: "16px",
  marginBottom: "14px",
  border: `1px solid ${vars.color.border}`,
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
  minHeight: "44px",
  appearance: "none",
  padding: "10px 12px",
  fontSize: "15px",
  color: vars.color.text,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  outline: "none",
});

export const input = style({
  width: "100%",
  minHeight: "44px",
  padding: "10px 12px",
  fontSize: "15px",
  color: vars.color.text,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
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
  borderRadius: vars.radius.md,
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
  // 下部ナビ(固定)の真上に置く。セーフエリアはナビ側が持つので、ここでは足さない
  bottom: `calc(${vars.layout.navHeight} + env(safe-area-inset-bottom, 0px))`,
  padding: `${vars.space.md} ${vars.space.lg}`,
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
  borderRadius: vars.radius.md,
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.5 },
  },
});

export const banner = style({
  padding: "10px 12px",
  borderRadius: vars.radius.sm,
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

// ── グループ見出し ────────────────────────────────────────
// 「診断に関わる設定」と「今日のジャーナルの設定」を視覚的に分ける。
// 診断入力とジャーナルのカスタマイズが混ざって見えないようにするため。

export const groupTitle = style({
  fontSize: "12px",
  fontWeight: 700,
  color: vars.color.textSecondary,
  letterSpacing: "0.04em",
  margin: "22px 2px 10px",
});

export const groupNote = style({
  fontSize: "11px",
  lineHeight: 1.6,
  color: vars.color.textFaint,
  margin: "-6px 2px 12px",
});

// ── 選択チップ(移動手段・曜日) ──────────────────────────

export const chipRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
});

export const chip = style({
  padding: "8px 12px",
  minHeight: "44px",
  fontSize: "13px",
  color: vars.color.textBody,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.pill,
  cursor: "pointer",
});

export const chipSelected = style({
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  borderColor: vars.color.accent,
  fontWeight: 600,
});

/** 曜日チップ(7個が1行に収まるよう幅を詰める) */
export const weekdayChip = style({
  flex: 1,
  minHeight: "44px",
  minWidth: "0",
  padding: "8px 0",
  fontSize: "13px",
  textAlign: "center",
  color: vars.color.textBody,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
});

// ── よく行く場所 ──────────────────────────────────────────

export const placeList = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "12px",
});

export const placeItem = style({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "10px 12px",
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.borderFaint}`,
  borderRadius: vars.radius.sm,
});

export const placeBody = style({
  flex: 1,
  minWidth: 0,
});

export const placeName = style({
  fontSize: "14px",
  fontWeight: 600,
  color: vars.color.text,
});

export const placeMeta = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  marginTop: "2px",
  overflowWrap: "anywhere",
});

export const placeDelete = style({
  flexShrink: 0,
  minHeight: "44px",
  minWidth: "44px",
  padding: "6px 10px",
  fontSize: "12px",
  color: vars.color.textMuted,
  backgroundColor: "transparent",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
});

export const placeEmpty = style({
  fontSize: "12px",
  color: vars.color.textFaint,
  padding: "8px 0 12px",
});

/** 場所の追加フォーム(縦積み) */
export const placeForm = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  paddingTop: "12px",
  borderTop: `1px solid ${vars.color.borderHairline}`,
});

export const subButton = style({
  padding: "10px 14px",
  minHeight: "44px",
  fontSize: "14px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  border: "none",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  selectors: {
    "&:disabled": {
      opacity: 0.5,
      cursor: "default",
    },
  },
});
