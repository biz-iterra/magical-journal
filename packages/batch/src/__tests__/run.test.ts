import { MasterCalendarProvider } from "@mj/calendar-data";
import { describe, expect, it, vi } from "vitest";
import type { ActiveUser } from "../daily/run.js";
import { generateDailyForUser, runDailyBatch } from "../daily/run.js";
import { MockLlmProvider } from "../llm/mock.js";

const calendar = new MasterCalendarProvider();
const provider = new MockLlmProvider();
const silentLogger = { info: () => undefined, error: () => undefined };

describe("generateDailyForUser(per-user 純関数・DB 非依存)", () => {
  const user: ActiveUser = {
    userId: 1,
    birthDate: "1990-05-17",
    birthTime: null,
    charStyle: "male",
    lat: null,
    lng: null,
  };

  it("構造化データ + 3セクションを返す(保存はしない=戻り値のみ)", async () => {
    const gen = await generateDailyForUser(user, "2026-07-23", {
      provider,
      calendar,
      logger: silentLogger,
    });
    expect(gen.structured.date).toBe("2026-07-23");
    expect(gen.parsed).toBe(true);
    expect(gen.sections.fortune.length).toBeGreaterThan(0);
    expect(gen.sections.schedule.length).toBeGreaterThan(0);
    expect(gen.sections.characterNote.length).toBeGreaterThan(0);
  });

  it("パース不能な出力ではフォールバックし parsed=false を返す(throw しない)", async () => {
    const gen = await generateDailyForUser(user, "2026-07-23", {
      provider: { name: "empty", generate: () => Promise.resolve("JSON ではない出力") },
      calendar,
      logger: silentLogger,
    });
    expect(gen.parsed).toBe(false);
    // フォールバックで characterNote に原文を格納(機能は止めない)
    expect(gen.sections.characterNote).toContain("JSON ではない出力");
  });

  it("暦マスタ範囲外は throw する(呼び出し側でスキップ判断)", async () => {
    await expect(
      generateDailyForUser({ ...user, birthDate: "1800-01-01" }, "2026-07-23", {
        provider,
        calendar,
        logger: silentLogger,
      }),
    ).rejects.toThrow();
  });
});

describe("runDailyBatch", () => {
  it("全員成功: daily_fortunes 相当の保存が全員分呼ばれる(3セクション)", async () => {
    const users: ActiveUser[] = [
      {
        userId: 1,
        birthDate: "1990-05-17",
        birthTime: null,
        charStyle: "male",
        lat: null,
        lng: null,
      },
      {
        userId: 2,
        birthDate: "1988-03-01",
        birthTime: "23:30",
        charStyle: "female",
        lat: 35.68,
        lng: 139.76,
      },
    ];
    const saved: {
      userId: number;
      directionsJson: string | null;
      text: string | null;
      sectionsJson: string | null;
    }[] = [];
    const result = await runDailyBatch("2026-07-23", {
      provider,
      calendar,
      getUsers: () => users,
      saveFortune: (userId, _date, directionsJson, text, sectionsJson) =>
        saved.push({ userId, directionsJson, text, sectionsJson }),
      logger: silentLogger,
    });

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(saved).toHaveLength(2);
    // directions_json は構造化データの JSON、sections_json は3セクション
    for (const s of saved) {
      expect(s.text && s.text.length > 0).toBe(true);
      const parsed = JSON.parse(s.directionsJson ?? "{}") as { date: string };
      expect(parsed.date).toBe("2026-07-23");
      const sections = JSON.parse(s.sectionsJson ?? "{}") as {
        fortune: string;
        schedule: string;
        characterNote: string;
      };
      expect(sections.fortune.length).toBeGreaterThan(0);
      expect(sections.schedule.length).toBeGreaterThan(0);
      expect(sections.characterNote.length).toBeGreaterThan(0);
    }
  });

  it("失敗ユーザーはスキップして続行し、失敗一覧に残す", async () => {
    const users: ActiveUser[] = [
      {
        userId: 10,
        birthDate: "1990-05-17",
        birthTime: null,
        charStyle: "male",
        lat: null,
        lng: null,
      },
      // 暦マスタ範囲外 → 構造化データ算出で throw
      {
        userId: 11,
        birthDate: "1800-01-01",
        birthTime: null,
        charStyle: "male",
        lat: null,
        lng: null,
      },
      {
        userId: 12,
        birthDate: "1988-03-01",
        birthTime: null,
        charStyle: "female",
        lat: null,
        lng: null,
      },
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
        {
          userId: 20,
          birthDate: "1990-05-17",
          birthTime: null,
          charStyle: "unknown",
          lat: null,
          lng: null,
        },
      ],
      saveFortune,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(1);
    expect(saveFortune).toHaveBeenCalledTimes(1);
  });
});
