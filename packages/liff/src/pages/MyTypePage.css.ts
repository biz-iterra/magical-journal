import { style } from "@vanilla-extract/css";

// ── ページ全体 ────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const pageTitle = style({
  fontSize: "18px",
  fontWeight: 600,
  color: "#1a1a1a",
  marginBottom: "16px",
});

// ── ローディング / エラー ──────────────────────────────────

export const loadingWrap = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40dvh",
  color: "#888",
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
  color: "#dc2626",
  textAlign: "center",
});

export const retryButton = style({
  padding: "8px 20px",
  fontSize: "14px",
  fontWeight: 500,
  color: "#6366f1",
  backgroundColor: "#eef2ff",
  border: "1px solid #c7d2fe",
  borderRadius: "8px",
  cursor: "pointer",
  ":active": {
    backgroundColor: "#e0e7ff",
  },
});

// ── メインカード(ポテンシャルタイプ) ─────────────────────

export const mainCard = style({
  backgroundColor: "#fff",
  borderRadius: "16px",
  padding: "24px 20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const mainCardLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: "#6366f1",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "8px",
});

export const typeCodeLarge = style({
  fontSize: "32px",
  fontWeight: 700,
  color: "#1a1a1a",
  lineHeight: 1.2,
  marginBottom: "4px",
});

export const typeNameLarge = style({
  fontSize: "16px",
  fontWeight: 500,
  color: "#555",
  marginBottom: "12px",
});

export const characterName = style({
  fontSize: "14px",
  color: "#6366f1",
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
  backgroundColor: "#fff",
  borderRadius: "16px",
  padding: "20px 16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const hybridSecondary = style({
  flex: 1,
  backgroundColor: "#fff",
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
  color: "#6366f1",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "6px",
});

export const hybridCodeSmall = style({
  fontSize: "20px",
  fontWeight: 700,
  color: "#1a1a1a",
  lineHeight: 1.2,
  marginBottom: "2px",
});

export const hybridNameSmall = style({
  fontSize: "12px",
  color: "#888",
});

// ── キャラ画像プレースホルダ ──────────────────────────────

export const charPlaceholder = style({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  backgroundColor: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "12px",
  fontSize: "13px",
  color: "#a5b4fc",
  fontWeight: 500,
});

export const charPlaceholderSmall = style({
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "8px",
  fontSize: "10px",
  color: "#a5b4fc",
  fontWeight: 500,
});

// ── サブカード(共通) ─────────────────────────────────────

export const card = style({
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "16px 20px",
  marginBottom: "10px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
});

export const cardLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: "#999",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: "6px",
});

export const cardValue = style({
  fontSize: "18px",
  fontWeight: 600,
  color: "#1a1a1a",
});

export const cardSub = style({
  fontSize: "13px",
  color: "#888",
  marginTop: "2px",
});

// ── マスターナンバーバッジ ──────────────────────────────

export const masterBadge = style({
  display: "inline-block",
  fontSize: "10px",
  fontWeight: 600,
  color: "#d97706",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "4px",
  padding: "2px 6px",
  marginLeft: "8px",
  verticalAlign: "middle",
});
