import { MasterCalendarProvider } from "@mj/calendar-data";
import { describe, expect, it, vi } from "vitest";
import { MockLlmProvider } from "../llm/mock.js";
import type { ActiveUser } from "../monthly/run.js";
import { runMonthlyBatch } from "../monthly/run.js";

const calendar = new MasterCalendarProvider();
const provider = new MockLlmProvider();
const silentLogger = { info: () => undefined, error: () => undefined };

/** 常に未生成扱い(全ユーザー生成される) */
const neverExists = () => false;

describe("runMonthlyBatch", () => {
  it("全員成功: monthly_fortunes 相当の保存が全員分呼ばれ、気学月キーで保存する", async () => {
    const users: ActiveUser[] = [
      { userId: 1, birthDate: "1990-05-17", birthTime: null, charStyle: "male" },
      { userId: 2, birthDate: "1988-03-01", birthTime: "23:30", charStyle: "female" },
    ];
    const saved: {
      userId: number;
      kigakuYear: number;
      kigakuMonth: number;
      directionsJson: string | null;
      text: string | null;
    }[] = [];
    const result = await runMonthlyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      hasFortune: neverExists,
      saveFortune: (userId, kigakuYear, kigakuMonth, directionsJson, text) =>
        saved.push({ userId, kigakuYear, kigakuMonth, directionsJson, text }),
      logger: silentLogger,
    });

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toHaveLength(0);
    expect(result.kigakuYear).toBe(2026);
    expect(saved).toHaveLength(2);
    for (const s of saved) {
      expect(s.text && s.text.length > 0).toBe(true);
      expect(s.kigakuYear).toBe(2026);
      expect(s.kigakuMonth).toBeGreaterThanOrEqual(1);
      expect(s.kigakuMonth).toBeLessThanOrEqual(12);
      const parsed = JSON.parse(s.directionsJson ?? "{}") as { kigakuYear: number };
      expect(parsed.kigakuYear).toBe(2026);
    }
  });

  it("冪等性: 既に生成済みの気学月はスキップし LLM を呼ばない", async () => {
    const users: ActiveUser[] = [
      { userId: 1, birthDate: "1990-05-17", birthTime: null, charStyle: "male" },
      { userId: 2, birthDate: "1988-03-01", birthTime: null, charStyle: "female" },
    ];
    const generate = vi.spyOn(provider, "generate");
    const saveFortune = vi.fn();
    // user 1 は既存、user 2 は未生成
    const hasFortune = (userId: number) => userId === 1;

    const result = await runMonthlyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      hasFortune,
      saveFortune,
      logger: silentLogger,
    });

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(saveFortune).toHaveBeenCalledTimes(1);
    expect(saveFortune.mock.calls[0]?.[0]).toBe(2);
    generate.mockRestore();
  });

  it("force: 既存でも再生成する", async () => {
    const users: ActiveUser[] = [
      { userId: 1, birthDate: "1990-05-17", birthTime: null, charStyle: "male" },
    ];
    const saveFortune = vi.fn();
    const result = await runMonthlyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      hasFortune: () => true, // 既存扱い
      saveFortune,
      force: true,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(1);
    expect(result.skipped).toBe(0);
    expect(saveFortune).toHaveBeenCalledTimes(1);
  });

  it("失敗ユーザーはスキップして続行し、失敗一覧に残す", async () => {
    const users: ActiveUser[] = [
      { userId: 10, birthDate: "1990-05-17", birthTime: null, charStyle: "male" },
      // 暦マスタ範囲外 → 構造化データ算出で throw
      { userId: 11, birthDate: "1800-01-01", birthTime: null, charStyle: "male" },
      { userId: 12, birthDate: "1988-03-01", birthTime: null, charStyle: "female" },
    ];
    const saveFortune = vi.fn();
    const result = await runMonthlyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      hasFortune: neverExists,
      saveFortune,
      logger: silentLogger,
    });

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.userId).toBe(11);
    expect(saveFortune).toHaveBeenCalledTimes(2);
    const savedIds = saveFortune.mock.calls.map((c) => c[0] as number);
    expect(savedIds).toEqual([10, 12]);
  });

  it("不正な char_style でも中立ボイスで生成でき、落ちない", async () => {
    const saveFortune = vi.fn();
    const result = await runMonthlyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => [
        { userId: 20, birthDate: "1990-05-17", birthTime: null, charStyle: "unknown" },
      ],
      hasFortune: neverExists,
      saveFortune,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(1);
    expect(saveFortune).toHaveBeenCalledTimes(1);
  });
});
