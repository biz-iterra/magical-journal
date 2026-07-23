import { globalStyle } from "@vanilla-extract/css";
// createGlobalTheme(:root) の副作用でセマンティックトークンを定義する。
import { vars } from "./theme.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
});

globalStyle("html", {
  fontSize: "16px",
  WebkitTextSizeAdjust: "100%",
});

globalStyle("body", {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
  lineHeight: 1.6,
  color: vars.color.text,
  backgroundColor: vars.color.surface,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("#root", {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
});

globalStyle("img", {
  maxWidth: "100%",
  height: "auto",
  display: "block",
});
