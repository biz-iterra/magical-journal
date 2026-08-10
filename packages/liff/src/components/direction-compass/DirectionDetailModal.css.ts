import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

/**
 * 方位の詳細モーダルのスタイル。
 *
 * - 影は使わず罫線で面を区切る(デザイン計画書 §5)。角丸は最小主義。
 * - 色・書体・余白はすべてトークン経由(ハードコード禁止)。
 * - モバイル(375×812)でシートが画面を越えないよう、本文だけがスクロールする。
 */

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 200,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  // 既存の送信中スクリムと同じ紙のヴェール(新しい色を作らない)
  backgroundColor: vars.color.overlayScrim,
  padding: vars.space.md,
  paddingTop: `calc(env(safe-area-inset-top, 0px) + ${vars.space.xl})`,
});

/** 背景。タップで閉じるためだけの面(スクリムは overlay 側が持つ) */
export const backdrop = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  border: "none",
  padding: 0,
  backgroundColor: "transparent",
  cursor: "default",
  WebkitTapHighlightColor: "transparent",
});

/**
 * 中身の面。`<dialog open>` として描画するので、UA 既定(absolute 配置・
 * 既定の枠と余白)を打ち消してからトークンで組み直す。
 */
export const sheet = style({
  position: "relative",
  inset: "auto",
  margin: 0,
  padding: 0,
  width: "100%",
  maxWidth: "480px",
  maxHeight: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  color: vars.color.textBody,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.borderInput}`,
  borderRadius: vars.radius.lg,
  outline: "none",
});

// ── 見出し ─────────────────────────────────────────────────

export const header = style({
  position: "relative",
  flexShrink: 0,
  padding: `${vars.space.lg} ${vars.space.lg} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
  // 上端だけキャラ色の気配を落とす(文字は載せない規約のため淡いまま)
  backgroundImage: `linear-gradient(180deg, ${vars.color.accentWash} 0%, ${vars.color.surface} 100%)`,
});

export const eyebrow = style({
  fontSize: "11px",
  letterSpacing: "0.08em",
  color: vars.color.textMuted,
});

export const title = style({
  marginTop: vars.space.xs,
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.title,
  fontWeight: 600,
  lineHeight: vars.lineHeight.tight,
  color: vars.color.text,
});

export const closeButton = style({
  position: "absolute",
  top: vars.space.sm,
  right: vars.space.sm,
  width: "44px",
  height: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: vars.fontSize.lead,
  lineHeight: 1,
  color: vars.color.textSecondary,
  backgroundColor: "transparent",
  border: "none",
  borderRadius: vars.radius.pill,
  cursor: "pointer",
  selectors: {
    "&:active": { backgroundColor: vars.color.surfaceSubtle },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px ${vars.color.accentFocusRing}`,
    },
  },
});

/** 読み上げ専用テキスト(閉じるボタンの名前など) */
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
});

// ── 本文(ここだけスクロールする) ────────────────────────

export const body = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  padding: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  overscrollBehavior: "contain",
});

// ── 吉凶 ───────────────────────────────────────────────────

export const fortuneRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
});

const badgeBase = style({
  display: "inline-block",
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.pill,
  fontSize: vars.fontSize.caption,
  fontWeight: 700,
  lineHeight: 1.6,
});

/** 吉凶バッジ。羅針盤のセルと同じ意味色を使う(盤とモーダルで色がずれない) */
export const fortuneBadge = styleVariants({
  great: [
    badgeBase,
    {
      color: vars.color.fortuneText,
      backgroundColor: vars.color.fortuneGreatBg,
      border: `1px solid ${vars.color.fortuneGreatBorder}`,
    },
  ],
  good: [
    badgeBase,
    {
      color: vars.color.fortuneText,
      backgroundColor: vars.color.fortuneBg,
      border: `1px solid ${vars.color.fortuneBorder}`,
    },
  ],
  bad: [
    badgeBase,
    {
      color: vars.color.dirMisfortuneText,
      backgroundColor: vars.color.dirMisfortuneBg,
      border: `1px solid ${vars.color.dirMisfortuneBorder}`,
    },
  ],
  neutral: [
    badgeBase,
    {
      color: vars.color.textMuted,
      backgroundColor: vars.color.surfaceSubtle,
      border: `1px solid ${vars.color.border}`,
    },
  ],
});

/** 凶方位の名前(五黄殺・暗剣殺 等)。盤の凶グレーと同系統 */
export const misfortuneChip = style({
  display: "inline-block",
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.caption,
  lineHeight: 1.6,
  color: vars.color.dirMisfortuneText,
  border: `1px solid ${vars.color.dirMisfortuneBorder}`,
});

// ── セクション ─────────────────────────────────────────────

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const sectionTitle = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.caption,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: vars.color.textSecondary,
  paddingBottom: vars.space.xs,
  borderBottom: `1px solid ${vars.color.borderHairline}`,
});

// ── 回座星 ─────────────────────────────────────────────────

export const starRow = style({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  gap: vars.space.sm,
});

export const starName = style({
  fontFamily: vars.font.heading,
  fontSize: vars.fontSize.lead,
  fontWeight: 600,
  color: vars.color.text,
});

export const elementTag = style({
  padding: `1px ${vars.space.sm}`,
  borderRadius: vars.radius.pill,
  fontSize: "11px",
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surfaceSubtle,
});

/** 「この方位の定位星」。回座星と取り違えないよう、必ず一段弱い扱いにする */
export const jyouiNote = style({
  fontSize: vars.fontSize.caption,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textMuted,
});

// ── 効果リスト ─────────────────────────────────────────────

export const effectBlock = style({
  padding: vars.space.md,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surfaceSubtle,
});

export const effectLead = style({
  fontSize: vars.fontSize.caption,
  fontWeight: 700,
  color: vars.color.textSecondary,
  marginBottom: vars.space.sm,
});

export const effectList = style({
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const effectItem = style({
  position: "relative",
  paddingLeft: vars.space.md,
  fontSize: vars.fontSize.body,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textBody,
  selectors: {
    "&::before": {
      content: "'・'",
      position: "absolute",
      left: 0,
      color: vars.color.textMuted,
    },
  },
});

/** もう一方の効果(今日は主ではない側)を畳んで置く */
export const details = style({
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  padding: `${vars.space.sm} ${vars.space.md}`,
});

export const summary = style({
  cursor: "pointer",
  fontSize: vars.fontSize.caption,
  color: vars.color.textSecondary,
  listStyle: "none",
  minHeight: "28px",
  display: "flex",
  alignItems: "center",
  selectors: {
    "&::-webkit-details-marker": { display: "none" },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px ${vars.color.accentFocusRing}`,
      borderRadius: vars.radius.sm,
    },
  },
});

export const detailsBody = style({
  paddingTop: vars.space.sm,
  marginTop: vars.space.sm,
  borderTop: `1px solid ${vars.color.borderHairline}`,
});

// ── 九星の作用・注記 ──────────────────────────────────────

export const starEffect = style({
  fontSize: vars.fontSize.body,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textBody,
});

/** 五黄のように「吉方位としては用いない」星は、作用ではなく注記として見せる */
export const starNote = style({
  padding: vars.space.md,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.borderInput}`,
  backgroundColor: vars.color.surfaceSubtle,
  fontSize: vars.fontSize.caption,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textSecondary,
});

// ── 象意キーワード ────────────────────────────────────────

export const keywordList = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: vars.space.md,
  rowGap: vars.space.sm,
  alignItems: "baseline",
});

export const keywordLabel = style({
  fontSize: vars.fontSize.caption,
  color: vars.color.textMuted,
  whiteSpace: "nowrap",
});

export const keywordValue = style({
  fontSize: vars.fontSize.caption,
  lineHeight: vars.lineHeight.body,
  color: vars.color.textBody,
  wordBreak: "break-word",
});

// ── 脚注 ───────────────────────────────────────────────────

export const footnote = style({
  fontSize: "11px",
  lineHeight: vars.lineHeight.body,
  color: vars.color.textMuted,
});
