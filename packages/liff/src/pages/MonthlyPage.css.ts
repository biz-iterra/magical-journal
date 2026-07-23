import { style } from "@vanilla-extract/css";

// 月間ページは今日のページ(TodayPage)の「月盤版」。
// 共通の見た目は TodayPage.css を再利用し、月間固有のスタイルのみここで定義する。
export {
  container,
  dateHeader,
  pageTitle,
  loadingWrap,
  errorWrap,
  errorText,
  retryButton,
  fortuneCard,
  fortuneText,
  fortuneEmpty,
  starRow,
  starChip,
  starChipLabel,
  starChipValue,
  sectionTitle,
  directionGrid,
  dirCell,
  dirCellGreat,
  dirCellFortune,
  dirCellNeutral,
  dirCellMisfortune,
  dirLabel,
  dirStar,
  dirBadge,
  dirBadgeGood,
  emptyCard,
  emptyText,
  registerLink,
  mapSection,
} from "./TodayPage.css";

// ── 月間固有 ──────────────────────────────────────────────

// カレンダー月と気学月がずれる点の注記
export const kigakuNote = style({
  fontSize: "11px",
  color: "#999",
  lineHeight: 1.5,
  marginBottom: "16px",
});
