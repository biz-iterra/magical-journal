import { useCallback, useEffect, useState } from "react";
import { setIdToken } from "../api/client";
import type { LiffInitResult, LiffProfile } from "../liff/init";
import { initLiff } from "../liff/init";

interface LiffState {
  /** 初期化が完了したか */
  readonly isReady: boolean;
  /** ログイン済みか */
  readonly isLoggedIn: boolean;
  /** LINE ユーザー ID */
  readonly userId: string | null;
  /** LINE プロフィール */
  readonly profile: LiffProfile | null;
  /** 初期化エラー */
  readonly error: Error | null;
}

const initialState: LiffState = {
  isReady: false,
  isLoggedIn: false,
  userId: null,
  profile: null,
  error: null,
};

/**
 * LIFF の初期化状態を管理するフック。
 * アプリ起動時に一度だけ初期化を実行する。
 */
export function useLiff(): LiffState {
  const [state, setState] = useState<LiffState>(initialState);

  const initialize = useCallback(async () => {
    try {
      const result: LiffInitResult = await initLiff();
      setIdToken(result.idToken);
      setState({
        isReady: true,
        isLoggedIn: true,
        userId: result.userId,
        profile: result.profile,
        error: null,
      });
    } catch (err) {
      console.error("[LIFF] 初期化エラー:", err);
      setState({
        isReady: true,
        isLoggedIn: false,
        userId: null,
        profile: null,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return state;
}
