import { formatError } from "../errors";
/**
 * LIFF SDK 型定義
 */
interface LiffProfile {
  readonly userId: string;
  readonly displayName: string;
  readonly pictureUrl?: string;
  readonly statusMessage?: string;
}

interface Liff {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(config?: { redirectUri?: string }): void;
  getProfile(): Promise<LiffProfile>;
  getIDToken(): string | null;
  isInClient(): boolean;
}

declare global {
  interface Window {
    liff: Liff;
  }
}

export type { LiffProfile };

export interface LiffInitResult {
  readonly userId: string;
  readonly profile: LiffProfile;
  readonly idToken: string | null;
}

const DEV_MODE = import.meta.env.DEV;

/**
 * LIFF SDK を初期化してプロフィールを取得する。
 * 開発モードでは LIFF SDK なしでもモックデータで動作する。
 */
export async function initLiff(): Promise<LiffInitResult> {
  const liffId = import.meta.env.VITE_LIFF_ID;

  // 開発モードかつ LIFF SDK が読み込まれていない場合はモックを返す
  if (DEV_MODE && (!window.liff || !liffId)) {
    console.warn("[LIFF] 開発モード: モックユーザーで動作します");
    return {
      userId: "dev-mock-user",
      profile: {
        userId: "dev-mock-user",
        displayName: "開発ユーザー",
        pictureUrl: undefined,
        statusMessage: undefined,
      },
      idToken: null,
    };
  }

  if (!window.liff) {
    throw new Error(formatError("LIFF SDK が読み込まれていません", "MJ-LIFF-001"));
  }

  if (!liffId) {
    throw new Error(formatError("VITE_LIFF_ID が設定されていません", "MJ-LIFF-001"));
  }

  await window.liff.init({ liffId });

  if (!window.liff.isLoggedIn()) {
    window.liff.login();
    // login() はリダイレクトするので、ここには到達しない
    throw new Error("ログインリダイレクト中");
  }

  const profile = await window.liff.getProfile();
  const idToken = window.liff.getIDToken();

  return {
    userId: profile.userId,
    profile,
    idToken,
  };
}
