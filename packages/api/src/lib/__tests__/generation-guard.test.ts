import { beforeEach, describe, expect, it, vi } from "vitest";
import { isBackingOff, resetGenerationGuard, runOnce, startOnce } from "../generation-guard.js";

/**
 * 生成の重複起動ガード。
 * 生成待ちの数秒〜十数秒に再アクセスされると、同じ内容の LLM 生成が並走して
 * そのぶん課金される。失敗が続く場合は毎アクセスで叩き続ける。どちらも防ぐ。
 */
describe("generation guard", () => {
  beforeEach(() => {
    resetGenerationGuard();
  });

  it("走っている間の同一キーは合流する(生成は1本だけ)", async () => {
    const task = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("done"), 20)),
    );

    const [a, b, c] = await Promise.all([
      runOnce("k", task),
      runOnce("k", task),
      runOnce("k", task),
    ]);

    expect(task).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual(["done", "done", "done"]);
  });

  it("キーが違えば別々に走る", async () => {
    const task = vi.fn(() => Promise.resolve("x"));
    await Promise.all([runOnce("a", task), runOnce("b", task)]);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("完了後は次の呼び出しで再度実行できる", async () => {
    const task = vi.fn(() => Promise.resolve("x"));
    await runOnce("k", task);
    await runOnce("k", task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("失敗は呼び出し元へ伝わり、しばらく再試行しない", async () => {
    const task = vi.fn(() => Promise.reject(new Error("LLM quota exhausted")));

    await expect(runOnce("k", task)).rejects.toThrow("LLM quota exhausted");
    expect(isBackingOff("k")).toBe(true);

    // バックオフ中は生成しない(undefined が返る)
    const second = await runOnce("k", task);
    expect(second).toBeUndefined();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("成功するとバックオフは解除される", async () => {
    await runOnce("k", () => Promise.resolve("ok"));
    expect(isBackingOff("k")).toBe(false);
  });

  it("startOnce は応答をブロックせず、失敗も呼び出し元へ投げない", async () => {
    const onError = vi.fn();
    const task = vi.fn(() => Promise.reject(new Error("boom")));

    startOnce("k", task, onError);
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });

    // 失敗直後は再発火しない(未生成の間アクセスのたびに叩かない)
    startOnce("k", task, onError);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("startOnce は走っている間の再発火をしない", async () => {
    const task = vi.fn(() => new Promise<void>((resolve) => setTimeout(() => resolve(), 20)));
    const onError = vi.fn();

    startOnce("k", task, onError);
    startOnce("k", task, onError);
    startOnce("k", task, onError);

    expect(task).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(isBackingOff("k")).toBe(false);
    });
    expect(onError).not.toHaveBeenCalled();
  });
});
