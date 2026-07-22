import { style } from "@vanilla-extract/css";

// ── ページ全体 ────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const dateHeader = style({
  fontSize: "14px",
  color: "#888",
  marginBottom: "4px",
});

export const pageTitle = style({
  fontSize: "20px",
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

// ── 運勢テキストカード ───────────────────────────────────

export const fortuneCard = style({
  backgroundColor: "#fff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const fortuneText = style({
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#333",
  whiteSpace: "pre-wrap",
});

export const fortuneEmpty = style({
  fontSize: "13px",
  color: "#999",
  textAlign: "center",
  padding: "12px 0",
});

// ── 九星情報 ──────────────────────────────────────────────

export const starRow = style({
  display: "flex",
  gap: "10px",
  marginBottom: "12px",
});

export const starChip = style({
  flex: 1,
  backgroundColor: "#fff",
  borderRadius: "10px",
  padding: "12px 14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
});

export const starChipLabel = style({
  fontSize: "10px",
  fontWeight: 600,
  color: "#999",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  marginBottom: "4px",
});

export const starChipValue = style({
  fontSize: "16px",
  fontWeight: 600,
  color: "#1a1a1a",
});

// ── 方位セクション ───────────────────────────────────────

export const sectionTitle = style({
  fontSize: "13px",
  fontWeight: 600,
  color: "#555",
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
  backgroundColor: "#dcfce7",
  border: "1px solid #bbf7d0",
});

export const dirCellFortune = style({
  backgroundColor: "#f0fdf4",
  border: "1px solid #d1fae5",
});

export const dirCellNeutral = style({
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
});

export const dirCellMisfortune = style({
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
});

export const dirLabel = style({
  fontSize: "11px",
  fontWeight: 600,
  color: "#555",
});

export const dirStar = style({
  fontSize: "10px",
  color: "#888",
});

export const dirBadge = style({
  fontSize: "9px",
  fontWeight: 600,
  color: "#dc2626",
  marginTop: "2px",
  lineHeight: 1.2,
});

export const dirBadgeGood = style({
  fontSize: "9px",
  fontWeight: 600,
  color: "#16a34a",
  marginTop: "2px",
});

// ── タブ切替 ──────────────────────────────────────────────

export const tabRow = style({
  display: "flex",
  gap: "4px",
  marginBottom: "12px",
  backgroundColor: "#f3f4f6",
  borderRadius: "10px",
  padding: "3px",
});

export const tab = style({
  flex: 1,
  padding: "8px 0",
  fontSize: "13px",
  fontWeight: 500,
  color: "#666",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s",
});

export const tabActive = style({
  backgroundColor: "#fff",
  color: "#1a1a1a",
  fontWeight: 600,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
});

// ── 未登録 ────────────────────────────────────────────────

export const emptyCard = style({
  backgroundColor: "#fff",
  borderRadius: "16px",
  padding: "32px 20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  textAlign: "center",
});

export const emptyText = style({
  fontSize: "14px",
  color: "#888",
  marginBottom: "16px",
});

export const registerLink = style({
  display: "inline-block",
  padding: "10px 24px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#6366f1",
  borderRadius: "10px",
  textDecoration: "none",
  ":active": {
    backgroundColor: "#4f46e5",
  },
});

// ── 方位マップ ──────────────────────────────────────────────

export const mapSection = style({
  marginTop: "16px",
});
