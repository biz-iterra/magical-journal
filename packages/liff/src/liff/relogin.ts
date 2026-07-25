/**
 * ID トークン期限切れからの自動回復(再ログイン)。
 *
 * LIFF の `isLoggedIn()` はアクセストークンの有無しか見ないため、ID トークンが
 * 期限切れでも true を返し、`getIDToken()` は期限切れの古いトークンを返す。
 * その結果 API 側の検証が失敗して MJ-AUTH-003 になる。
 *
 * そこで MJ-AUTH-003 を受け取ったら一度だけ logout → login でトークンを取り直す。
 * ★無限ループ防止: 1 セッションにつき 1 回だけ実行する(再ログイン後も失敗するなら
 *   期限切れ以外の原因なので、エラーをそのままユーザーに見せる)。
 */

/** 再ログイン試行済みフラグのキー(sessionStorage) */
const RELOGIN_FLAG_KEY = "mj.relogin.attempted";

/** 再ログインを試行済みか(sessionStorage が使えない環境では false 扱い) */
function hasAttempted(): boolean {
  try {
    return sessionStorage.getItem(RELOGIN_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function markAttempted(): void {
  try {
    sessionStorage.setItem(RELOGIN_FLAG_KEY, "1");
  } catch {
    // sessionStorage が使えない環境では諦める(ループ防止できないため再ログインもしない)
  }
}

/**
 * 認証に成功したときに呼び、次回の期限切れで再び自動回復できるようにする。
 */
export function clearReloginFlag(): void {
  try {
    sessionStorage.removeItem(RELOGIN_FLAG_KEY);
  } catch {
    // 何もしない
  }
}

/**
 * ID トークンを取り直すために再ログインする。
 *
 * @returns 再ログインを開始した(=リダイレクトする)なら true。
 *          既に試行済み/LIFF 未読込/sessionStorage 不可なら false(呼び出し側はエラーを表示する)。
 */
export function reloginForExpiredToken(): boolean {
  if (typeof window === "undefined" || !window.liff) {
    return false;
  }
  // sessionStorage が使えないとループ防止できないため再ログインしない
  try {
    sessionStorage.getItem(RELOGIN_FLAG_KEY);
  } catch {
    return false;
  }
  if (hasAttempted()) {
    return false;
  }
  markAttempted();

  try {
    // 期限切れトークンを確実に捨ててから再ログインする
    window.liff.logout();
  } catch {
    // logout に失敗しても login は試みる
  }
  window.liff.login();
  return true;
}
