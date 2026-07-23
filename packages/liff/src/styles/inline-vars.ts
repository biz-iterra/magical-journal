import type { CSSProperties } from "react";

/**
 * vanilla-extract の契約変数参照(例 "var(--color-accent__abc123)")を
 * インライン style で上書きできる形({ "--color-accent__abc123": value })へ変換する。
 *
 * @vanilla-extract/dynamic の assignInlineVars 相当を依存ゼロで実装したもの
 * (当リポジトリの pnpm ストアに dynamic が無いため)。
 * React 19 の style はカスタムプロパティのキーを受け付ける。
 */
export function assignInlineVars(map: Record<string, string>): CSSProperties {
  const out: Record<string, string> = {};
  for (const [ref, value] of Object.entries(map)) {
    out[cssVarName(ref)] = value;
  }
  return out as CSSProperties;
}

/** "var(--name)" / "var(--name, fallback)" から "--name" を取り出す。 */
function cssVarName(ref: string): string {
  const match = ref.match(/^var\((--[^,)]+)/);
  return match?.[1] ?? ref;
}

/**
 * 契約変数マップ({ "var(--x)": value })を要素の style へ直接適用し、
 * 元に戻すクリーンアップ関数を返す。document.documentElement へ適用すると
 * :root 既定(インディゴ)をアプリ全体で上書きできる(キャラテーマ注入)。
 */
export function applyThemeVars(element: HTMLElement, map: Record<string, string>): () => void {
  const applied: string[] = [];
  for (const [ref, value] of Object.entries(map)) {
    const name = cssVarName(ref);
    element.style.setProperty(name, value);
    applied.push(name);
  }
  return () => {
    for (const name of applied) {
      element.style.removeProperty(name);
    }
  };
}
