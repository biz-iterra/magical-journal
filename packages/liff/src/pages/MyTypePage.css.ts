import { keyframes, style } from "@vanilla-extract/css";
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
// 主タイプを主役(大・上・単一表示と同体裁)に、副タイプを従属
// (小・下・沈めたインセット面)として 1 枚のカード内に階層化する。
// 横並びにせず縦積みにすることで、狭幅の LIFF WebView(375px 以下)でも
// 主大画像・副パネルのどちらも縮んで破綻しない。

// 主タイプのヒーロー領域。子要素(charImage 等)は単一表示と共有し一貫性を保つ。
export const hybridPrimary = style({});

// 副タイプ = 一段沈めたインセット面。主役より小さく・地味にして従属を明示する。
export const hybridSecondary = style({
  marginTop: "20px",
  padding: "12px 14px",
  backgroundColor: vars.color.surfaceSubtle,
  borderRadius: "12px",
});

export const hybridSecondaryLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.textFaint,
  letterSpacing: "0.04em",
  marginBottom: "10px",
});

// 副タイプ内: 小画像 + テキスト列の横並び
export const hybridSecondaryRow = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const hybridSecondaryText = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const hybridCodeSmall = style({
  fontSize: "18px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.2,
});

export const hybridNameSmall = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
});

// 副キャラ名(ハイブリッドの副パネル)
export const hybridCharName = style({
  fontSize: "12px",
  fontWeight: 500,
  color: vars.color.accent,
});

// ハイブリッドの意味付け(なぜ 2 キャラ出るか)の固定コピー
export const hybridNote = style({
  marginTop: "16px",
  fontSize: "12px",
  lineHeight: 1.6,
  color: vars.color.textMuted,
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
  width: "56px",
  height: "56px",
  flexShrink: 0,
  borderRadius: "50%",
  objectFit: "cover",
  objectPosition: "top",
  backgroundColor: vars.color.accentSubtle,
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

// ── AI占い(性質レポート) ────────────────────────────────

// 事前生成済みレポートを見るための主動線ボタン(アクセントの塗り)。
export const aiButton = style({
  width: "100%",
  padding: "14px 20px",
  fontSize: "15px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  border: "none",
  borderRadius: "12px",
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

// レポート本体カード
export const reportCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const reportHeaderRow = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "8px",
  marginBottom: "16px",
});

export const reportBadge = style({
  fontSize: "11px",
  fontWeight: 600,
  color: vars.color.accent,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
});

export const reportTitle = style({
  fontSize: "18px",
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1.3,
});

export const reportSubtitle = style({
  fontSize: "13px",
  color: vars.color.textSecondary,
  marginTop: "2px",
});

// 6項目
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

// 準備中 / エラー
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

// 再生成(β品質テスト用の副次ボタン。主ボタンに見せないよう地味な体裁にする)
export const regenRow = style({
  marginTop: "18px",
  paddingTop: "14px",
  borderTop: `1px solid ${vars.color.borderHairline}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px",
});

export const regenNote = style({
  fontSize: "11px",
  color: vars.color.textFaint,
  textAlign: "center",
});

export const regenButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "7px 16px",
  fontSize: "12px",
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "8px",
  cursor: "pointer",
  ":active": {
    backgroundColor: vars.color.surfaceMuted,
  },
  ":disabled": {
    opacity: 0.6,
    cursor: "default",
  },
});

// ── レポート内スピナー ────────────────────────────────────

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

// 再生成ボタン内の小スピナー(currentColor でボタン文字色に追従)
export const spinnerSmall = style({
  width: "13px",
  height: "13px",
  borderRadius: "50%",
  border: "2px solid transparent",
  borderTopColor: "currentColor",
  borderRightColor: "currentColor",
  animation: `${spin} 0.7s linear infinite`,
});
