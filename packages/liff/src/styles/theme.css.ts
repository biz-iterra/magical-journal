import { createGlobalTheme, createThemeContract } from "@vanilla-extract/css";

/**
 * セマンティックトークン契約(Claude Design「デザイン計画書(Aフェーズ)」適用版)
 *
 * 一次情報: Claude Design プロジェクト b4b22951-5f59-432a-92e9-ec0dd9d6d5dc
 *   `docs/design-plan-A.md` §2 カラートークン案 / §3 タイプ案
 *   `今日のページ.dc.html`(W-1「気配のヘッダー」プロトタイプ)
 *
 * 設計方針(docs/06 / docs/07 実装ルール #2, #3):
 * - 基調は「紙と墨」。紙 = 和紙のようなオフホワイト(赤み側に1〜2度倒す)、
 *   墨 = 純黒を避けた茶墨。ニュートラルは彩度 0.02 以下に収め、
 *   **色の主張はキャラ色(accent 系)だけが担う**。
 * - **影は使わない。面の区切りは罫線(border)で行う**。角丸は最小(sm 8 / md 12 / lg 18)。
 * - 全画面はこの契約のトークン経由でのみ色・書体・角丸を参照する(ハードコード禁止)。
 * - アクセント系(accent*)のみキャラごとに CSS 変数で差し替える。
 *   ニュートラル・意味色(吉凶=fortune/misfortune 等)はキャラで変えない固定値。
 *
 * キャラ色の役割分離(デザイン計画書 §2-2。淡色キャラのコントラスト事故を構造的に防ぐ):
 *   - accent      … 線・見出し・アイコン。紙の上で AA を満たす深さに正規化された色
 *   - accentWash  … **気配専用の淡い面**(ヘッダーのグラデ・選択状態の地)。
 *                   **ここに文字を絶対に載せない**。淡色キャラでも事故が起きない
 *   - onAccent    … accent を塗り面にしたときの文字色
 *
 * 値の注入は :root へ createGlobalTheme で行う(既定 = キャラ未確定時の墨アクセント)。
 * キャラテーマは styles/character-themes.ts が accent 系の変数のみ上書きする。
 *
 * v1 はライトのみ。sumiVeil(反転面)をダーク拡張の起点として持つ。
 */
export const vars = createThemeContract({
  color: {
    // ── ニュートラル: 背景・サーフェス ──────────────────────
    bg: null, // アプリ地の背景(--paper)
    surface: null, // カード等の面(--paper-raised)
    surfaceSubtle: null, // 一段沈めた面(入力・セル)
    surfaceMuted: null, // タブトラック等
    sumiVeil: null, // 反転面(墨。帯・強調ブロック)。ダーク拡張の起点
    onSumiVeil: null, // 反転面の上の文字色
    // ── ニュートラル: 境界(影の代わりに面を区切る) ────────
    border: null, // 標準境界(--line)
    borderInput: null, // 入力枠(標準よりわずかに強い)
    borderHairline: null, // 極薄の仕切り
    borderFaint: null, // ナビ上端等
    // ── ニュートラル: テキスト(墨 → 淡墨のランプ) ─────────
    text: null, // 見出し・強(--ink)
    textBody: null, // 本文
    textSecondary: null, // 副見出し・ラベル
    textTertiary: null, // 補助操作テキスト
    textMuted: null, // 弱いテキスト(--ink-soft)
    textFaint: null, // さらに弱い
    textDisabled: null, // 非活性・プレースホルダ寄り
    textPlaceholder: null, // 入力プレースホルダ
    // ── アクセント(=キャラ色。キャラテーマで注入) ─────────
    accent: null, // 主アクセント(線・見出し・アイコン・ボタン)
    accentStrong: null, // 押下・ホバーの濃色
    accentWash: null, // 気配専用の淡い面。**文字を載せない**
    accentSubtle: null, // アクセントの淡い背景(文字を載せてよい薄さ)
    accentSubtleStrong: null, // アクセント淡背景の押下
    accentBorder: null, // アクセント淡境界(無効ボタン等)
    accentBorderStrong: null, // アクセント中境界
    onAccent: null, // アクセント上の文字色(AA 担保)
    accentFocusRing: null, // フォーカスリング(半透明アクセント)
    // ── 意味色: 吉(fortune) ── キャラで変えない固定 ─────────
    // デザイン計画書は意味色の hex を定義していないため、既存の確定値を維持する
    // (docs/06「吉=緑/凶=赤の意味色は固定」)。
    fortuneGreatBg: null, // 大吉セル背景
    fortuneGreatBorder: null,
    fortuneBg: null, // 吉セル背景
    fortuneBorder: null,
    fortuneText: null, // 吉テキスト・成功
    // ── 意味色: 凶(misfortune) ── 固定 ──────────────────────
    misfortuneBg: null,
    misfortuneBorder: null,
    misfortuneText: null, // 凶・エラーテキスト
    // ── 意味色: 方位盤の凶 ── 固定 ──────────────────────────
    dirMisfortuneBg: null,
    dirMisfortuneBorder: null,
    dirMisfortuneText: null,
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
  /**
   * 書体3役(デザイン計画書 §3)。
   * - heading: 明朝。暦・手帖の品格を出す。大日付・キャラの語り・画面名
   * - body   : ゴシック。UI 地の文・ボタン・ラベル
   * - どちらも Web フォント読み込み失敗時に和文フォールバックで崩れない並びにする
   */
  font: {
    heading: null,
    body: null,
  },
  /** タイプスケール(デザイン計画書 §3。px 固定) */
  fontSize: {
    display: null, // 34 大日付
    title: null, // 22 画面名・主要見出し
    lead: null, // 18 運勢文(キャラの語り)
    body: null, // 15 本文
    caption: null, // 13 補助・ラベル
    num: null, // 13 方位角・星番号等のデータ数字
  },
  lineHeight: {
    tight: null, // 見出し
    body: null, // 1.75
    lead: null, // 1.9 ゆっくり読ませる
  },
  /** 角丸(最小主義。ポップに見せない) */
  radius: {
    sm: null, // 8
    md: null, // 12
    lg: null, // 18
    pill: null,
  },
  /** 余白スケール */
  space: {
    xs: null,
    sm: null,
    md: null,
    lg: null,
    xl: null,
    xxl: null,
  },
  /** 画面の骨格。固定要素どうしが重ならないよう高さをここで一元管理する */
  layout: {
    /** 下部ナビの高さ(セーフエリアは含まない) */
    navHeight: null,
  },
});

createGlobalTheme(":root", vars, {
  color: {
    // 紙と墨(デザイン計画書 §2-1 の 6 色)
    bg: "#faf7f1", // --paper
    surface: "#ffffff", // --paper-raised
    surfaceSubtle: "#f5f1e9",
    surfaceMuted: "#efeade",
    sumiVeil: "#1f1d1a",
    onSumiVeil: "#faf7f1",

    border: "#e7e1d6", // --line
    borderInput: "#d9d2c4",
    borderHairline: "#efeae0",
    borderFaint: "#e7e1d6",

    text: "#2a2723", // --ink
    textBody: "#34302a",
    textSecondary: "#4a453d",
    textTertiary: "#575249",
    textMuted: "#6b655c", // --ink-soft
    textFaint: "#716b61", // 紙の上で AA(4.94)を保つ最も弱い"読ませる"文字
    textDisabled: "#8e887e", // 非活性(WCAG のコントラスト要件対象外)
    textPlaceholder: "#746e64", // 未選択でも読ませる文言に使うため AA(4.72)を確保

    // 既定アクセント = 墨(キャラ未確定時)。デザイン計画書に既定色の定義が無いため、
    // 「色の主張はキャラ色だけが担う」規律に従い、基調の墨をそのまま使う。
    // 登録画面・友達診断の初期表示がこの値になる。
    accent: "#2a2723",
    accentStrong: "#131210",
    accentWash: "#efeae0",
    accentSubtle: "#f3efe7",
    accentSubtleStrong: "#e9e3d8",
    accentBorder: "#cdc7bc",
    accentBorderStrong: "#a49d92",
    onAccent: "#ffffff",
    accentFocusRing: "rgba(42, 39, 35, 0.14)",

    // ── 意味色(固定)──────────────────────────────────────
    // 面(bg/border)は従来値のまま。文字色のみ、紙(#faf7f1)と各意味色の面の
    // 双方で AA を満たす深さへ落とした(docs/06 品質基準 > 従来の明度)。
    fortuneGreatBg: "#dcfce7",
    fortuneGreatBorder: "#bbf7d0",
    fortuneBg: "#f0fdf4",
    fortuneBorder: "#d1fae5",
    fortuneText: "#15803d", // 旧 #16a34a は紙上 3.08 で AA 未達

    misfortuneBg: "#fef2f2",
    misfortuneBorder: "#fecaca",
    misfortuneText: "#c81e1e", // 旧 #dc2626 は misfortuneBg 上 4.41 で AA 未達

    dirMisfortuneBg: "#e5e7eb",
    dirMisfortuneBorder: "#9ca3af",
    dirMisfortuneText: "#4b5563",

    danger: "#c81e1e", // 旧 #ef4444 は紙上 3.52 で AA 未達
    warningText: "#b45309", // 旧 #d97706 は紙上 2.98 で AA 未達
    warningBg: "#fffbeb",
    warningBorder: "#fde68a",
    successBg: "#f0fdf4",

    overlayScrim: "rgba(250, 247, 241, 0.82)",
    overlaySaveBar: "rgba(250, 247, 241, 0.96)",
  },
  font: {
    // Web フォント未読込・読込失敗時は端末の和文明朝/ゴシックへフォールバックする。
    heading:
      '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", serif',
    body: '"Zen Kaku Gothic New", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif',
  },
  fontSize: {
    display: "34px",
    title: "22px",
    lead: "18px",
    body: "15px",
    caption: "13px",
    num: "13px",
  },
  lineHeight: {
    tight: "1.4",
    body: "1.75",
    lead: "1.9",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "18px",
    pill: "999px",
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
  },
  layout: {
    navHeight: "56px",
  },
});
