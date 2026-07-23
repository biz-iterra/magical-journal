import type { PotentialTypeId } from "@mj/engine";
import { getCharacterName } from "@mj/engine";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "../api/client";
import { deriveCharacterThemeVars } from "../styles/character-themes";
import { applyThemeVars } from "../styles/inline-vars";

// 友達診断は未登録者の入口かつ端末内完結(サーバー非接触。docs/06 / CLAUDE.md ルール5)。
// このルートで起動した場合は自分のテーマ取得(/api/profile)も行わない。
const SERVER_FREE_PATH = "/friend";

interface CharacterThemeContextValue {
  /** 現在アクティブなキャラテーマのタイプ(未設定=既定インディゴ)。 */
  readonly themeType: PotentialTypeId | null;
  /** テーマを差し替える(友達診断の結果カード等で一時的に上書き)。 */
  readonly setThemeType: (typeId: PotentialTypeId | null) => void;
  /**
   * ログイン中ユーザー自身のキャラ名(主タイプ × charStyle)。未取得/未登録なら null。
   * 「今日のページ」の「{キャラ名}からの一言」見出しなどで再利用する
   * (取得元が無ければ呼び出し側で汎用見出しにフォールバックする)。
   */
  readonly ownCharacterName: string | null;
}

const CharacterThemeContext = createContext<CharacterThemeContextValue | null>(null);

// /api/profile の必要部分のみ(MyTypePage と同形状)
interface ProfileResponse {
  profile?: { charStyle?: "male" | "female" };
  diagnosis: { moduleId: string; result: unknown }[];
}

function readPrimaryType(res: ProfileResponse): PotentialTypeId | null {
  const potential = res.diagnosis.find((d) => d.moduleId === "potential");
  const result = potential?.result;
  if (result && typeof result === "object" && "primaryType" in result) {
    // ハイブリッドでも主タイプの色を採用(docs/01 §2 / docs/06)
    return (result as { primaryType: PotentialTypeId }).primaryType;
  }
  return null;
}

/**
 * キャラテーマ注入プロバイダ。
 *
 * - マウント時に /api/profile を取得し、ログイン中ユーザーの主ポテンシャルタイプから
 *   アクセント色を決めて document.documentElement の CSS 変数へ注入する。
 *   ただし友達診断入口(/friend)で起動した場合は取得しない(サーバー非接触を保証)。
 * - accent 系の変数のみ上書きするため、ニュートラル・意味色(吉凶)は不変。
 * - 未登録(404)や未取得の間は既定インディゴのまま(登録画面へ導線)。
 * - setThemeType で友達診断の結果タイプへ一時的に切り替えられる。
 *
 * 注: char_style は現状 accent 色に影響しない(色はタイプ単位)。将来 male/female で
 * 色を分ける場合はここで seed を切り替える。
 */
export function CharacterThemeProvider({ children }: { children: ReactNode }) {
  // baseType = ログイン中ユーザー自身のタイプ(profile 由来・固定)
  const [baseType, setBaseType] = useState<PotentialTypeId | null>(null);
  // charStyle = ログイン中ユーザーの表示スタイル(キャラ名の男女差に使用)
  const [charStyle, setCharStyle] = useState<"male" | "female" | null>(null);
  // overrideType = 友達診断の結果カード等による一時上書き
  const [overrideType, setOverrideType] = useState<PotentialTypeId | null>(null);

  // 実効テーマ: 上書きがあればそれ、無ければユーザー自身のテーマ
  const themeType = overrideType ?? baseType;

  // ユーザー自身のキャラ名(主タイプ × charStyle)。override とは独立(常に本人の名前)。
  const ownCharacterName = baseType && charStyle ? getCharacterName(baseType, charStyle) : null;

  // 起動時のパス(マウント時に一度だけ確定)。友達診断入口ならサーバー非接触にする。
  const initialPath = useRef(useLocation().pathname);

  useEffect(() => {
    if (initialPath.current === SERVER_FREE_PATH) return;
    let cancelled = false;
    apiClient
      .get<ProfileResponse>("/api/profile")
      .then((res) => {
        if (cancelled) return;
        setBaseType(readPrimaryType(res));
        setCharStyle(res.profile?.charStyle ?? null);
      })
      .catch(() => {
        // 未登録・未認証など。既定インディゴのまま。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!themeType) return;
    return applyThemeVars(document.documentElement, deriveCharacterThemeVars(themeType));
  }, [themeType]);

  const value = useMemo<CharacterThemeContextValue>(
    () => ({ themeType, setThemeType: setOverrideType, ownCharacterName }),
    [themeType, ownCharacterName],
  );

  return <CharacterThemeContext.Provider value={value}>{children}</CharacterThemeContext.Provider>;
}

/**
 * キャラテーマの現在値と切替関数を取得する。
 * Provider 外で呼ばれた場合は no-op(既定インディゴ)を返す。
 */
export function useCharacterTheme(): CharacterThemeContextValue {
  return (
    useContext(CharacterThemeContext) ?? {
      themeType: null,
      setThemeType: () => {},
      ownCharacterName: null,
    }
  );
}
