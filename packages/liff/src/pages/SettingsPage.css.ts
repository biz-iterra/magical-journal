import { style } from "@vanilla-extract/css";

export const container = style({
  paddingBottom: "80px",
});

export const pageTitle = style({
  fontSize: "20px",
  fontWeight: 700,
  color: "#1a1a1a",
  margin: "8px 0 20px",
});

export const section = style({
  backgroundColor: "#fff",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
});

export const sectionLabel = style({
  fontSize: "13px",
  fontWeight: 600,
  color: "#6366f1",
  marginBottom: "10px",
});

export const readonlyValue = style({
  fontSize: "15px",
  color: "#333",
});

export const readonlyNote = style({
  fontSize: "11px",
  color: "#999",
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
  color: "#1a1a1a",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  outline: "none",
});

export const input = style({
  width: "100%",
  padding: "10px 12px",
  fontSize: "15px",
  color: "#1a1a1a",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  outline: "none",
  boxSizing: "border-box",
  selectors: {
    "&:focus": { borderColor: "#6366f1" },
  },
});

export const hint = style({
  fontSize: "11px",
  color: "#999",
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
  backgroundColor: "#f9fafb",
  border: "2px solid #e5e7eb",
  borderRadius: "12px",
  cursor: "pointer",
});

export const styleCardSelected = style({
  borderColor: "#6366f1",
  backgroundColor: "#eef2ff",
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
  color: "#1a1a1a",
});

export const styleCardDesc = style({
  fontSize: "11px",
  color: "#888",
  marginTop: "2px",
});

export const saveBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
  backgroundColor: "rgba(255,255,255,0.95)",
  borderTop: "1px solid #eee",
  backdropFilter: "blur(8px)",
});

export const saveButton = style({
  width: "100%",
  padding: "14px",
  fontSize: "15px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#6366f1",
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
  backgroundColor: "#fef2f2",
  color: "#dc2626",
});

export const bannerSuccess = style({
  backgroundColor: "#f0fdf4",
  color: "#16a34a",
});

export const loadingWrap = style({
  textAlign: "center",
  padding: "40px 0",
  color: "#888",
});
