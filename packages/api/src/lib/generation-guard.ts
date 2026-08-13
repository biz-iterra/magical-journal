/**
 * 文章生成の重複起動ガード。
 *
 * リクエストトリガー方式(CLAUDE.md ルール6)は「未生成なら生成する」ので、
 * 生成中の数秒〜十数秒に再アクセスされると同じ内容の生成が並走する。
 * さらに生成が失敗し続ける状態(APIキー枯渇など)では、行が未生成のまま残るため
 * アクセスのたびに LLM を叩き続ける。どちらも課金に直結する。
 *
 * ここでは以下を提供する:
 * - in-flight 合流: 同一キーの生成が走っていれば、その Promise を待つだけにする
 * - 失敗バックオフ: 直近の失敗から一定時間は再試行しない
 *
 * ★プロセス内メモリでの管理。api は単一プロセスで動かす前提(docker-compose)。
 *   複数プロセスに増やす場合は DB を使う方式へ移す必要がある。
 */

/** 失敗後、同じキーの生成を再試行しない時間(ミリ秒) */
const FAILURE_BACKOFF_MS = 10 * 60 * 1000;

const inFlight = new Map<string, Promise<unknown>>();
const failedAt = new Map<string, number>();

/** バックオフ中(直近に失敗していて、まだ再試行しない)かどうか */
export function isBackingOff(key: string, now: number = Date.now()): boolean {
  const at = failedAt.get(key);
  if (at === undefined) return false;
  if (now - at >= FAILURE_BACKOFF_MS) {
    failedAt.delete(key);
    return false;
  }
  return true;
}

/**
 * 同一キーの生成を1本にまとめて実行する。
 *
 * - すでに走っていれば、その完了を待つ(新しい生成は始めない)
 * - 直近に失敗していればバックオフし、`undefined` を返す(生成しない)
 * - 失敗したら記録し、しばらく再試行しない
 *
 * @returns 生成結果。バックオフ中は undefined
 */
export async function runOnce<T>(key: string, task: () => Promise<T>): Promise<T | undefined> {
  const running = inFlight.get(key);
  if (running) {
    return (await running) as T;
  }
  if (isBackingOff(key)) {
    return undefined;
  }

  const promise = task();
  inFlight.set(key, promise);
  try {
    const result = await promise;
    failedAt.delete(key);
    return result;
  } catch (err) {
    failedAt.set(key, Date.now());
    throw err;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * 応答をブロックせずに1本だけ走らせる(fire-and-forget)。
 * 生成中・バックオフ中は何もしない。例外は呼び出し元へ伝えない。
 */
export function startOnce(
  key: string,
  task: () => Promise<unknown>,
  onError: (err: unknown) => void,
): void {
  if (inFlight.has(key) || isBackingOff(key)) return;
  void runOnce(key, task).catch(onError);
}

/** テスト用。内部状態を空にする */
export function resetGenerationGuard(): void {
  inFlight.clear();
  failedAt.clear();
}
