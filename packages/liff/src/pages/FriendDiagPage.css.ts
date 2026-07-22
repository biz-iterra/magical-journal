import { style } from "@vanilla-extract/css";

// ── レイアウト ─────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const pageTitle = style({
  fontSize: "18px",
  fontWeight: 600,
  color: "#1a1a1a",
  marginBottom: "4px",
});

export const pageSubtitle = style({
  fontSize: "13px",
  color: "#888",
  marginBottom: "20px",
});

// ── 入力フォーム ──────────────────────────────────────────

export const formCard = style({
  backgroundColor: "#fff",
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
  color: "#555",
  marginBottom: "6px",
});

export const requiredBadge = style({
  fontSize: "11px",
  color: "#ef4444",
  marginLeft: "4px",
});

export const optionalBadge = style({
  fontSize: "11px",
  color: "#999",
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
  border: "1px solid #ddd",
  borderRadius: "10px",
  backgroundColor: "#fff",
  color: "#1a1a1a",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
  backgroundPosition: "right 8px center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "20px 20px",
  ":focus": {
    outline: "none",
    borderColor: "#6366f1",
    boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)",
  },
});

export const input = style({
  width: "100%",
  height: "48px",
  padding: "0 14px",
  fontSize: "16px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  backgroundColor: "#fff",
  color: "#1a1a1a",
  ":focus": {
    outline: "none",
    borderColor: "#6366f1",
    boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)",
  },
  "::placeholder": {
    color: "#bbb",
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
  color: "#fff",
  backgroundColor: "#6366f1",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  marginTop: "8px",
  ":disabled": {
    backgroundColor: "#c7d2fe",
    cursor: "not-allowed",
  },
  ":active": {
    backgroundColor: "#4f46e5",
  },
});

// ── 結果セクション ───────────────────────────────────────

export const resultSection = style({
  marginTop: "8px",
});

export const resultHeader = style({
  fontSize: "15px",
  fontWeight: 600,
  color: "#1a1a1a",
  marginBottom: "12px",
});

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
  fontSize: "28px",
  fontWeight: 700,
  color: "#1a1a1a",
  lineHeight: 1.2,
  marginBottom: "4px",
});

export const typeNameLarge = style({
  fontSize: "15px",
  fontWeight: 500,
  color: "#555",
});

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

// ── 注意書き ──────────────────────────────────────────────

export const privacyNote = style({
  fontSize: "11px",
  color: "#aaa",
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
  color: "#666",
  backgroundColor: "#f3f4f6",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  marginTop: "8px",
  ":active": {
    backgroundColor: "#e5e7eb",
  },
});
