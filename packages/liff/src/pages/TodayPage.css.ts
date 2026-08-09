import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// ── ページ全体 ────────────────────────────────────────────

export const container = style({
  paddingBottom: vars.space.xl,
});

// ── W-1「気配のヘッダー」(シグネチャ) ─────────────────────
// デザイン計画書 §4 の採用案。キャラ色の wash を上端から下へ淡く落とし、
// その中に大きな日付を置く。キャラ本体は描かず、色と余白だけで気配を出す。
// wash の上には**文字を載せない**規約なので、日付・曜日は紙の上と同じ墨で描く
// (wash は紙にごく近い明度のため、実測でも AA を維持できる)。
//
// Layout の main は左右 16px の余白を持つため、負マージンで全幅に抜く。

export const header = style({
  position: "relative",
  marginTop: `calc(-1 * ${vars.space.lg})`,
  marginLeft: `calc(-1 * ${vars.space.lg})`,
  marginRight: `calc(-1 * ${vars.space.lg})`,
  marginBottom: vars.space.lg,
  padding: `calc(env(safe-area-inset-top, 0px) + ${vars.space.xl}) ${vars.space.lg} ${vars.space.lg}`,
  overflow: "hidden",
  borderBottom: `1px solid ${vars.color.border}`,
  // 上端 = キャラの wash、下端 = 紙へ溶ける
  backgroundImage: `linear-gradient(180deg, ${vars.color.accentWash} 0%, ${vars.color.bg} 100%)`,
});

// 和紙の縦罫テクスチャ(気配のみ。情報を持たない装飾なので極薄)
export const headerTexture = style({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0px, rgba(255,255,255,0.55) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 7px)",
});

export const headerInner = style({
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.md,
});

/** 大日付(明朝数字で「暦の顔」を作る) */
export const headerDate = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.display,
  fontWeight: 400,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.text,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.02em",
});

/** 和暦 ・ 曜日 */
export const headerMeta = style({
  marginTop: vars.space.xs,
  fontSize: vars.fontSize.caption,
  color: vars.color.textMuted,
  fontVariantNumeric: "tabular-nums",
});

/** 画面名。大日付が主役なので静かに添える */
export const headerTitle = style({
  marginTop: vars.space.md,
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.caption,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: vars.color.textSecondary,
});

/** 右上の小さなキャラ章(円形マーク + 名前) */
export const headerMark = style({
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.xs,
});

export const headerMarkCircle = style({
  width: "44px",
  height: "44px",
  borderRadius: vars.radius.pill,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.lead,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
});

export const headerMarkName = style({
  fontSize: "11px",
  color: vars.color.textMuted,
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
  fontSize: vars.fontSize.caption,
});

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

// アクセント色のスピナー(初回アクセスは同期生成で数秒〜十数秒かかりうる)
export const spinner = style({
  width: "28px",
  height: "28px",
  borderRadius: vars.radius.pill,
  border: `3px solid ${vars.color.accentSubtleStrong}`,
  borderTopColor: vars.color.accent,
  animation: `${spin} 0.8s linear infinite`,
});

export const loadingText = style({
  fontSize: vars.fontSize.caption,
  color: vars.color.textMuted,
  textAlign: "center",
});

export const errorWrap = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "40dvh",
  gap: vars.space.md,
  padding: "20px",
});

export const errorText = style({
  fontSize: vars.fontSize.body,
  color: vars.color.misfortuneText,
  textAlign: "center",
});

export const retryButton = style({
  minHeight: "44px",
  padding: `${vars.space.sm} 20px`,
  fontSize: vars.fontSize.body,
  fontWeight: 500,
  color: vars.color.accent,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.accentBorderStrong}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  ":active": {
    backgroundColor: vars.color.accentSubtle,
  },
});

// ── 運勢テキストカード ───────────────────────────────────
// 影は使わず罫線で面を区切る(デザイン計画書 §5「過剰な角丸+影」の排除)。

export const fortuneCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: "20px",
  marginBottom: vars.space.md,
});

export const fortuneText = style({
  fontSize: vars.fontSize.body,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textBody,
  whiteSpace: "pre-wrap",
});

/** キャラの語り(運勢文)。明朝・行間ゆったりで「ゆっくり読ませる」 */
export const fortuneLead = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.lead,
  lineHeight: vars.lineHeight.lead,
  color: vars.color.text,
  whiteSpace: "pre-wrap",
});

export const fortuneEmpty = style({
  fontSize: vars.fontSize.caption,
  color: vars.color.textFaint,
  textAlign: "center",
  padding: `${vars.space.md} 0`,
});

// 今月の運勢の補足(気学月は節入り基準でカレンダー月とずれるため明示する)
export const monthlyMeta = style({
  fontSize: "11px",
  color: vars.color.textMuted,
  marginBottom: "6px",
});

// ── 運勢3セクション(運勢 / スケジュール / キャラの一言) ─────

export const fortuneSection = style({
  selectors: {
    "& + &": {
      marginTop: vars.space.lg,
      paddingTop: vars.space.lg,
      borderTop: `1px solid ${vars.color.borderHairline}`,
    },
  },
});

/** セクション見出し。細い罫を右へ伸ばして「手帖の項目」に見せる */
export const fortuneSectionTitle = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  fontSize: vars.fontSize.caption,
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: vars.color.accent,
  marginBottom: vars.space.sm,
  "::after": {
    content: '""',
    flex: 1,
    height: "1px",
    backgroundColor: vars.color.border,
  },
});

// キャラの一言。語りであることが分かるよう明朝 + アクセントの縦線で括る
export const fortuneCharBody = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.lead,
  lineHeight: vars.lineHeight.lead,
  color: vars.color.text,
  whiteSpace: "pre-wrap",
  borderLeft: `2px solid ${vars.color.accent}`,
  paddingLeft: "14px",
});

// ── 今日のスケジュール(複数行タイムライン) ─────────────────

export const scheduleList = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const scheduleLine = style({
  fontSize: vars.fontSize.body,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textBody,
  paddingLeft: "10px",
  borderLeft: `2px solid ${vars.color.accentBorder}`,
});

// ── 盤を見る日付・年月の切り替え ──────────────────────────

export const pickerRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginBottom: vars.space.md,
  padding: `${vars.space.sm} 10px`,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
});

export const pickerArrow = style({
  flexShrink: 0,
  width: "44px",
  height: "44px",
  fontSize: vars.fontSize.caption,
  color: vars.color.textBody,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  selectors: {
    "&:disabled": { opacity: 0.35, cursor: "default" },
  },
});

export const pickerValue = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontSize: vars.fontSize.body,
  fontWeight: 600,
  color: vars.color.text,
  fontVariantNumeric: "tabular-nums",
});

export const pickerSelect = style({
  flex: 1,
  appearance: "none",
  minHeight: "44px",
  padding: `${vars.space.sm} 10px`,
  fontSize: vars.fontSize.body,
  textAlign: "center",
  color: vars.color.text,
  backgroundColor: vars.color.surfaceSubtle,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  outline: "none",
});

/** 日付そのものを選ぶ入力(モバイルではネイティブの日付ピッカーが開く) */
export const pickerDate = style({
  appearance: "none",
  minHeight: "44px",
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontFamily: "inherit",
  fontSize: vars.fontSize.body,
  fontWeight: 600,
  color: vars.color.text,
  backgroundColor: "transparent",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  outline: "none",
  fontVariantNumeric: "tabular-nums",
  selectors: {
    "&:focus": { borderColor: vars.color.accent },
  },
});

/** 「今日」「今月」を示す小さなラベル */
export const pickerBadge = style({
  fontSize: "10px",
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  padding: "2px 6px",
});

export const pickerReset = style({
  flexShrink: 0,
  minHeight: "44px",
  padding: "6px 10px",
  fontSize: "11px",
  color: vars.color.accent,
  backgroundColor: "transparent",
  border: `1px solid ${vars.color.accentBorderStrong}`,
  borderRadius: vars.radius.sm,
  cursor: "pointer",
});

// ── タブ切替 ──────────────────────────────────────────────

export const tabRow = style({
  display: "flex",
  gap: vars.space.xs,
  marginBottom: vars.space.md,
  backgroundColor: vars.color.surfaceMuted,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: "3px",
});

export const tab = style({
  flex: 1,
  minHeight: "44px",
  padding: `${vars.space.sm} 0`,
  fontSize: vars.fontSize.caption,
  fontWeight: 500,
  color: vars.color.textTertiary,
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  textAlign: "center",
  transition: "background-color 0.15s, color 0.15s",
});

export const tabActive = style({
  backgroundColor: vars.color.surface,
  borderColor: vars.color.border,
  color: vars.color.text,
  fontWeight: 600,
});

// ── 時盤: 時間帯スライダー ─────────────────────────────────

export const hourPanel = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space.md} 14px 10px`,
  marginBottom: vars.space.md,
});

export const hourValue = style({
  fontFamily: vars.font.heading,
  fontSize: "20px",
  fontWeight: 600,
  color: vars.color.accent,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  marginBottom: "6px",
});

// つまみは指で掴める大きさ(28px)。トラックは 6px。
export const hourRange = style({
  WebkitAppearance: "none",
  appearance: "none",
  display: "block",
  width: "100%",
  height: "44px",
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
  borderRadius: vars.radius.pill,
  backgroundColor: vars.color.accent,
  border: `2px solid ${vars.color.surface}`,
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
  color: vars.color.textMuted,
  fontVariantNumeric: "tabular-nums",
});

// ── 未登録 ────────────────────────────────────────────────

export const emptyCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: "32px 20px",
  marginBottom: vars.space.md,
  textAlign: "center",
});

export const emptyText = style({
  fontSize: vars.fontSize.body,
  color: vars.color.textMuted,
  marginBottom: vars.space.lg,
});

export const registerLink = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "10px 24px",
  fontSize: vars.fontSize.body,
  fontWeight: 600,
  color: vars.color.onAccent,
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.sm,
  textDecoration: "none",
  ":active": {
    backgroundColor: vars.color.accentStrong,
  },
});

// ── 方位マップ ──────────────────────────────────────────────

export const mapSection = style({
  marginTop: vars.space.lg,
});
