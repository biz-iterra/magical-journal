import { style } from "@vanilla-extract/css";

// ── レイアウト ─────────────────────────────────────────────

export const container = style({
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#fafafa",
});

export const header = style({
  padding: "24px 20px 0",
  textAlign: "center",
});

export const title = style({
  fontSize: "20px",
  fontWeight: 600,
  color: "#1a1a1a",
  marginBottom: "4px",
});

export const subtitle = style({
  fontSize: "13px",
  color: "#888",
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
  backgroundColor: "#ddd",
  transition: "background-color 0.2s, transform 0.2s",
});

export const stepDotActive = style({
  backgroundColor: "#6366f1",
  transform: "scale(1.3)",
});

export const stepDotDone = style({
  backgroundColor: "#a5b4fc",
});

export const stepLabel = style({
  fontSize: "12px",
  color: "#999",
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

export const selectWrapper = style({
  position: "relative",
  flex: 1,
});

export const select = style({
  width: "100%",
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

export const selectPlaceholder = style({
  color: "#aaa",
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

export const romajiPreview = style({
  marginTop: "8px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "#555",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  letterSpacing: "0.05em",
  wordBreak: "break-all",
});

export const romajiNote = style({
  fontSize: "11px",
  color: "#999",
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
  border: "2px solid #e5e7eb",
  backgroundColor: "#fff",
  textAlign: "center",
  cursor: "pointer",
  transition: "border-color 0.15s, box-shadow 0.15s",
  minHeight: "48px",
  ":active": {
    transform: "scale(0.98)",
  },
});

export const styleCardSelected = style({
  borderColor: "#6366f1",
  boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)",
});

export const styleCardLabel = style({
  fontSize: "15px",
  fontWeight: 600,
  color: "#1a1a1a",
  marginBottom: "4px",
});

export const styleCardDesc = style({
  fontSize: "12px",
  color: "#888",
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
  color: "#666",
  backgroundColor: "#f3f4f6",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  ":active": {
    backgroundColor: "#e5e7eb",
  },
});

export const nextButton = style({
  flex: 1,
  height: "48px",
  fontSize: "15px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#6366f1",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  ":disabled": {
    backgroundColor: "#c7d2fe",
    cursor: "not-allowed",
  },
  ":active": {
    backgroundColor: "#4f46e5",
  },
});

// ── エラー ────────────────────────────────────────────────

export const errorBanner = style({
  margin: "0 20px 16px",
  padding: "12px 14px",
  fontSize: "13px",
  color: "#dc2626",
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  border: "1px solid #fecaca",
});

// ── 送信中オーバーレイ ──────────────────────────────────────

export const submittingOverlay = style({
  position: "fixed",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  zIndex: 100,
  fontSize: "15px",
  color: "#555",
});
