import { MasterCalendarProvider } from "@mj/calendar-data";
import { describe, expect, it, vi } from "vitest";
import type { ActiveUser } from "../daily/run.js";
import { runDailyBatch } from "../daily/run.js";
import { MockLlmProvider } from "../llm/mock.js";

const calendar = new MasterCalendarProvider();
const provider = new MockLlmProvider();
const silentLogger = { info: () => undefined, error: () => undefined };

describe("runDailyBatch", () => {
  it("全員成功: daily_fortunes 相当の保存が全員分呼ばれる", async () => {
    const users: ActiveUser[] = [
      { userId: 1, birthDate: "1990-05-17", birthTime: null, charStyle: "male" },
      { userId: 2, birthDate: "1988-03-01", birthTime: "23:30", charStyle: "female" },
    ];
    const saved: { userId: number; directionsJson: string | null; text: string | null }[] = [];
    const result = await runDailyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      saveFortune: (userId, _date, directionsJson, text) =>
        saved.push({ userId, directionsJson, text }),
      logger: silentLogger,
    });

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(saved).toHaveLength(2);
    // directions_json は構造化データの JSON、text は非空
    for (const s of saved) {
      expect(s.text && s.text.length > 0).toBe(true);
      const parsed = JSON.parse(s.directionsJson ?? "{}") as { date: string };
      expect(parsed.date).toBe("2026-07-23");
    }
  });

  it("失敗ユーザーはスキップして続行し、失敗一覧に残す", async () => {
    const users: ActiveUser[] = [
      { userId: 10, birthDate: "1990-05-17", birthTime: null, charStyle: "male" },
      // 暦マスタ範囲外 → 構造化データ算出で throw
      { userId: 11, birthDate: "1800-01-01", birthTime: null, charStyle: "male" },
      { userId: 12, birthDate: "1988-03-01", birthTime: null, charStyle: "female" },
    ];
    const saveFortune = vi.fn();
    const result = await runDailyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      saveFortune,
      logger: silentLogger,
    });

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.userId).toBe(11);
    // 成功した2名のみ保存される(失敗ユーザーは保存しない)
    expect(saveFortune).toHaveBeenCalledTimes(2);
    const savedIds = saveFortune.mock.calls.map((c) => c[0] as number);
    expect(savedIds).toEqual([10, 12]);
  });

  it("不正な char_style でも中立ボイスで生成でき、落ちない", async () => {
    const saveFortune = vi.fn();
    const result = await runDailyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => [
        { userId: 20, birthDate: "1990-05-17", birthTime: null, charStyle: "unknown" },
      ],
      saveFortune,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(1);
    expect(saveFortune).toHaveBeenCalledTimes(1);
  });
});
