import { MasterCalendarProvider } from "@mj/calendar-data";
import { describe, expect, it } from "vitest";
import { buildDailyStructured } from "../daily/structured.js";

const calendar = new MasterCalendarProvider();

describe("buildDailyStructured", () => {
  it("engine の算出値を構造化する(1990-05-17 / 2026-07-23)", () => {
    const s = buildDailyStructured(
      { birthDate: "1990-05-17", birthTime: null, date: "2026-07-23" },
      calendar,
    );

    // 検算例(CLAUDE.md): 1990年生 → 本命 一白(1)
    expect(s.honmeiStar).toBe(1);
    expect(s.honmeiStarName).toBe("一白水星");
    // ポテンシャル: 1990-05-17 → IL+(engine 側テスト済み)
    expect(s.potentialType).toBe("IL+");
    expect(s.typeName).toBe("個性的な理論派");
    expect(s.date).toBe("2026-07-23");
  });

  it("吉方位と凶方位は同じ方位に重複しない", () => {
    const s = buildDailyStructured(
      { birthDate: "1990-05-17", birthTime: null, date: "2026-07-23" },
      calendar,
    );
    const good = new Set(s.goodDirections.map((d) => d.direction));
    const bad = new Set(s.badDirections.map((d) => d.direction));
    for (const d of good) {
      expect(bad.has(d)).toBe(false);
    }
  });

  it("星番号は1〜9、方位ラベル・星名は既知集合", () => {
    const s = buildDailyStructured(
      { birthDate: "1988-03-01", birthTime: null, date: "2026-07-23" },
      calendar,
    );
    const dirLabels = new Set(["北", "北東", "東", "南東", "南", "南西", "西", "北西"]);
    for (const d of [...s.goodDirections, ...s.badDirections]) {
      expect(d.star).toBeGreaterThanOrEqual(1);
      expect(d.star).toBeLessThanOrEqual(9);
      expect(dirLabels.has(d.label)).toBe(true);
      expect(d.starName.endsWith("星")).toBe(true);
    }
    for (const b of s.badDirections) {
      expect(b.misfortunes.length).toBeGreaterThan(0);
    }
  });
});
