import { createGlobalTheme, createThemeContract } from "@vanilla-extract/css";

/**
 * セマンティックトークン契約(3-1 キャラテーマ トークン基盤)
 *
 * 設計方針(docs/06 §動的キャラテーマ / docs/07 実装ルール #2, #3):
 * - ニュートラル基調(紙・墨)を土台にし、キャラ色を「アクセント」として注入する。
 * - 全画面はこの契約のトークン経由でのみ色を参照する(ハードコード色ゼロ)。
 * - アクセント系(accent*)のみキャラごとに CSS 変数で差し替える。
 *   ニュートラル・意味色(吉凶=fortune/misfortune 等)はキャラで変えない固定値。
 * - 淡いキャラ色でも AA を満たすため on-accent(アクセント上の文字色, U4)を独立トークン化。
 *
 * 値の注入は :root へ createGlobalTheme で行う(既定=現行のニュートラル+インディゴ)。
 * キャラテーマは styles/character-themes.ts が accent 系の変数のみ上書きする
 * (assignInlineVars 相当をネスト要素へ適用。cascade で :root 既定を上書き)。
 *
 * v1 はライトのみ。ダークは将来 :root[data-theme="dark"] で同契約を再割当できる構造。
 */
export const vars = createThemeContract({
  color: {
    // ── ニュートラル: 背景・サーフェス ──────────────────────
    bg: null, // アプリ地の背景
    surface: null, // カード等の面
    surfaceSubtle: null, // 一段沈めた面(入力・セル)
    surfaceMuted: null, // タブトラック等
    // ── ニュートラル: 境界 ──────────────────────────────────
    border: null, // 標準境界
    borderInput: null, // 入力枠
    borderHairline: null, // 極薄の仕切り
    borderFaint: null, // ナビ上端等
    // ── ニュートラル: テキスト ──────────────────────────────
    text: null, // 見出し・強
    textBody: null, // 本文
    textSecondary: null, // 副見出し・ラベル
    textTertiary: null, // 補助操作テキスト
    textMuted: null, // 弱いテキスト
    textFaint: null, // さらに弱い
    textDisabled: null, // 非活性・プレースホルダ寄り
    textPlaceholder: null, // 入力プレースホルダ
    // ── アクセント(=キャラ色。キャラテーマで注入) ─────────
    accent: null, // 主アクセント(ボタン・リンク・アクティブ)
    accentStrong: null, // 押下・ホバーの濃色
    accentSubtle: null, // アクセントの淡い背景
    accentSubtleStrong: null, // アクセント淡背景の押下
    accentBorder: null, // アクセント淡境界(無効ボタン等)
    accentBorderStrong: null, // アクセント中境界
    onAccent: null, // アクセント上の文字色(AA 担保, U4)
    accentFocusRing: null, // フォーカスリング(半透明アクセント)
    // ── 意味色: 吉(fortune) ── キャラで変えない固定 ─────────
    fortuneGreatBg: null, // 大吉セル背景
    fortuneGreatBorder: null,
    fortuneBg: null, // 吉セル背景
    fortuneBorder: null,
    fortuneText: null, // 吉テキスト・成功
    // ── 意味色: 凶(misfortune) ── 固定 ──────────────────────
    misfortuneBg: null,
    misfortuneBorder: null,
    misfortuneText: null, // 凶・エラーテキスト
    // ── 状態色 ── 固定 ──────────────────────────────────────
    danger: null, // 必須マーカー等の赤
    warningText: null, // 注記(マスターナンバー等)
    warningBg: null,
    warningBorder: null,
    successBg: null,
    // ── オーバーレイ ────────────────────────────────────────
    overlayScrim: null, // 送信中スクリム
    overlaySaveBar: null, // 固定保存バー背景
  },
});

/**
 * 既定テーマ = 現行のニュートラル基調 + インディゴ(未ログイン/既定アクセント)。
 * この値は現行 UI の見た目を保存する(3-1 は基盤移行で見た目を変えない)。
 * キャラテーマ未注入時(登録画面・友達診断の既定)はこの値が使われる。
 */
createGlobalTheme(":root", vars, {
  color: {
    bg: "#fafafa",
    surface: "#ffffff",
    surfaceSubtle: "#f9fafb",
    surfaceMuted: "#f3f4f6",

    border: "#e5e7eb",
    borderInput: "#dddddd",
    borderHairline: "#eeeeee",
    borderFaint: "#e0e0e0",

    text: "#1a1a1a",
    textBody: "#333333",
    textSecondary: "#555555",
    textTertiary: "#666666",
    textMuted: "#888888",
    textFaint: "#999999",
    textDisabled: "#aaaaaa",
    textPlaceholder: "#bbbbbb",

    accent: "#6366f1",
    accentStrong: "#4f46e5",
    accentSubtle: "#eef2ff",
    accentSubtleStrong: "#e0e7ff",
    accentBorder: "#c7d2fe",
    accentBorderStrong: "#a5b4fc",
    onAccent: "#ffffff",
    accentFocusRing: "rgba(99, 102, 241, 0.12)",

    fortuneGreatBg: "#dcfce7",
    fortuneGreatBorder: "#bbf7d0",
    fortuneBg: "#f0fdf4",
    fortuneBorder: "#d1fae5",
    fortuneText: "#16a34a",

    misfortuneBg: "#fef2f2",
    misfortuneBorder: "#fecaca",
    misfortuneText: "#dc2626",

    danger: "#ef4444",
    warningText: "#d97706",
    warningBg: "#fffbeb",
    warningBorder: "#fde68a",
    successBg: "#f0fdf4",

    overlayScrim: "rgba(255, 255, 255, 0.8)",
    overlaySaveBar: "rgba(255, 255, 255, 0.95)",
  },
});
