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
  // 画面全体の地は「紙」。overscroll でも白が覗かない。
  backgroundColor: vars.color.bg,
});

globalStyle("body", {
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.body,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textBody,
  backgroundColor: vars.color.bg,
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

// フォーム部品は既定でゴシックを継承する(WebView の既定書体に戻らないように)
globalStyle("button, input, select, textarea", {
  fontFamily: "inherit",
});

// 見出しは明朝(書体3役)。サイズは各画面がトークンで指定する。
globalStyle("h1, h2, h3", {
  fontFamily: vars.font.heading,
  fontWeight: 600,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.text,
});

// 数字は表組み用数字で桁を揃える(方位角・星番号・日付)
globalStyle("time, [data-num]", {
  fontVariantNumeric: "tabular-nums",
});

// docs/06 品質基準: モーションは prefers-reduced-motion を必ず尊重する
globalStyle("*, *::before, *::after", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animationDuration: "0.01ms !important",
      animationIterationCount: "1 !important",
      transitionDuration: "0.01ms !important",
      scrollBehavior: "auto",
    },
  },
});
