import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── ページ全体 ────────────────────────────────────────────

export const container = style({
  paddingBottom: "24px",
});

export const dateHeader = style({
  fontSize: "14px",
  color: vars.color.textMuted,
  marginBottom: "4px",
});

export const pageTitle = style({
  fontSize: "20px",
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: "16px",
});

// ── ローディング / エラー ──────────────────────────────────

export const loadingWrap = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40dvh",
  gap: "14px",
  color: vars.color.textMuted,
  fontSize: "14px",
});

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

// アクセント色のスピナー(初回アクセスは同期生成で数秒〜十数秒かかりうる)
export const spinner = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: `3px solid ${vars.color.accentSubtleStrong}`,
  borderTopColor: vars.color.accent,
  animation: `${spin} 0.8s linear infinite`,
});

export const loadingText = style({
  fontSize: "13px",
  color: vars.color.textMuted,
  textAlign: "center",
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

// ── 運勢テキストカード ───────────────────────────────────

export const fortuneCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
});

export const fortuneText = style({
  fontSize: "14px",
  lineHeight: 1.7,
  color: vars.color.textBody,
  whiteSpace: "pre-wrap",
});

export const fortuneEmpty = style({
  fontSize: "13px",
  color: vars.color.textFaint,
  textAlign: "center",
  padding: "12px 0",
});

// 今月の運勢の補足(気学月は節入り基準でカレンダー月とずれるため明示する)
export const monthlyMeta = style({
  fontSize: "11px",
  color: vars.color.textMuted,
  marginBottom: "6px",
});

// ── 運勢3セクション(運勢 / スケジュール / キャラの一言) ─────
// 1枚のカード内に3セクションを縦積みし、セクション間は極薄の仕切りで区切る。

// 2番目以降のセクションに上マージン + 上罫線を付ける
export const fortuneSection = style({
  selectors: {
    "& + &": {
      marginTop: "16px",
      paddingTop: "16px",
      borderTop: `1px solid ${vars.color.borderHairline}`,
    },
  },
});

export const fortuneSectionTitle = style({
  fontSize: "13px",
  fontWeight: 600,
  color: vars.color.accent,
  marginBottom: "6px",
});

// キャラの一言セクションの見出し(アクセント色を少し弱める必要はないが、
// 内容がキャラのトーンであることを示すため本文をアクセント淡背景で括る)
export const fortuneCharBody = style({
  fontSize: "14px",
  lineHeight: 1.7,
  color: vars.color.textBody,
  whiteSpace: "pre-wrap",
  backgroundColor: vars.color.accentSubtle,
  borderRadius: "10px",
  padding: "12px 14px",
});

// ── 今日のスケジュール(複数行タイムライン) ─────────────────
// schedule は「HH:MM〜HH:MM 場所で行動。どうなるか。」の行を \n 区切りで持つ。
// 1つの塊にせず、各行を1行ずつ独立して積む。

export const scheduleList = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const scheduleLine = style({
  fontSize: "14px",
  lineHeight: 1.6,
  color: vars.color.textBody,
  paddingLeft: "10px",
  borderLeft: `2px solid ${vars.color.accentBorder}`,
});

// ── 九星情報 ──────────────────────────────────────────────
// 本命星・月命星のチップは削除した。表示は MyTypePage に集約しており、
// 唯一の再利用元だった MonthlyPage も今日のジャーナルへ集約して廃止したため(v0.6)。

// ── 方位セクション ───────────────────────────────────────
// 方位盤(羅針盤)の見た目とセル配色は components/direction-compass に集約した
// (中宮も盤の中央に統合したため、ここにあった見出し・グリッドのスタイルは不要)。

// ── タブ切替 ──────────────────────────────────────────────

export const tabRow = style({
  display: "flex",
  gap: "4px",
  marginBottom: "12px",
  backgroundColor: vars.color.surfaceMuted,
  borderRadius: "10px",
  padding: "3px",
});

export const tab = style({
  flex: 1,
  padding: "8px 0",
  fontSize: "13px",
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s",
});

export const tabActive = style({
  backgroundColor: vars.color.surface,
  color: vars.color.text,
  fontWeight: 600,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
});

// ── 時盤: 時間帯スライダー ─────────────────────────────────
// 時盤タブ選択時のみ、盤タブの直下に表示する。12刻を 1:00〜3:00 から
// 順に並べ、子刻(23:00〜1:00)を末尾に置く(表示順は TodayPage 側で決定)。

export const hourPanel = style({
  backgroundColor: vars.color.surface,
  borderRadius: "12px",
  padding: "12px 14px 10px",
  marginBottom: "12px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
});

export const hourValue = style({
  fontSize: "20px",
  fontWeight: 700,
  color: vars.color.accent,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  marginBottom: "6px",
});

// つまみは指で掴める大きさ(28px)。トラックは 8px。
export const hourRange = style({
  WebkitAppearance: "none",
  appearance: "none",
  display: "block",
  width: "100%",
  height: "28px",
  margin: 0,
  padding: 0,
  backgroundColor: "transparent",
  cursor: "pointer",
  ":focus": {
    outline: "none",
  },
});

const trackStyle = {
  height: "6px",
  borderRadius: "3px",
  backgroundColor: vars.color.surfaceMuted,
  border: `1px solid ${vars.color.border}`,
} as const;

// トラック(8px)の中央につまみ(28px)を合わせる: (8 - 28) / 2 = -10px
const thumbStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  backgroundColor: vars.color.accent,
  border: `2px solid ${vars.color.surface}`,
  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
  cursor: "pointer",
} as const;

globalStyle(`${hourRange}::-webkit-slider-runnable-track`, trackStyle);
globalStyle(`${hourRange}::-webkit-slider-thumb`, {
  WebkitAppearance: "none",
  appearance: "none",
  marginTop: "-10px",
  ...thumbStyle,
});
globalStyle(`${hourRange}::-moz-range-track`, trackStyle);
globalStyle(`${hourRange}::-moz-range-thumb`, thumbStyle);
globalStyle(`${hourRange}:focus-visible::-webkit-slider-thumb`, {
  boxShadow: `0 0 0 4px ${vars.color.accentFocusRing}`,
});

export const hourScale = style({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "10px",
  color: vars.color.textFaint,
  fontVariantNumeric: "tabular-nums",
});

// ── 未登録 ────────────────────────────────────────────────

export const emptyCard = style({
  backgroundColor: vars.color.surface,
  borderRadius: "16px",
  padding: "32px 20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  textAlign: "center",
});

export const emptyText = style({
  fontSize: "14px",
  color: vars.color.textMuted,
  marginBottom: "16px",
});

export const registerLink = style({
  display: "inline-block",
  padding: "10px 24px",
  fontSize: "14px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  borderRadius: "10px",
  textDecoration: "none",
  ":active": {
    backgroundColor: vars.color.accentStrong,
  },
});

// ── 方位マップ ──────────────────────────────────────────────

export const mapSection = style({
  marginTop: "16px",
});
