import { MasterCalendarProvider } from "@mj/calendar-data";
import { describe, expect, it } from "vitest";
import { buildMonthlyStructured } from "../monthly/structured.js";

const calendar = new MasterCalendarProvider();

describe("buildMonthlyStructured", () => {
  it("engine の算出値を月盤ベースで構造化する(1990-05-17 / 2026-07-23)", () => {
    const s = buildMonthlyStructured(
      { birthDate: "1990-05-17", birthTime: null, date: "2026-07-23" },
      calendar,
    );

    // 検算例(CLAUDE.md): 1990年生 → 本命 一白(1)
    expect(s.honmeiStar).toBe(1);
    expect(s.honmeiStarName).toBe("一白水星");
    // ポテンシャル: 1990-05-17 → IL+(engine 側テスト済み)
    expect(s.potentialType).toBe("IL+");
    expect(s.typeName).toBe("個性的な理論派");
    // 節入り基準の気学年・気学月
    expect(s.kigakuYear).toBe(2026);
    expect(s.kigakuMonth).toBeGreaterThanOrEqual(1);
    expect(s.kigakuMonth).toBeLessThanOrEqual(12);
    // 月盤中宮の星
    expect(s.monthCenterStar).toBeGreaterThanOrEqual(1);
    expect(s.monthCenterStar).toBeLessThanOrEqual(9);
    expect(s.monthCenterStarName.endsWith("星")).toBe(true);
  });

  it("気学月は節入りをまたぐと切り替わる(小暑前後で別の気学月)", () => {
    // 小暑(7月上旬)より前と後で気学月が変わることを確認
    const before = buildMonthlyStructured(
      { birthDate: "1990-05-17", birthTime: null, date: "2026-07-01" },
      calendar,
    );
    const after = buildMonthlyStructured(
      { birthDate: "1990-05-17", birthTime: null, date: "2026-07-23" },
      calendar,
    );
    expect(after.kigakuMonth).not.toBe(before.kigakuMonth);
  });

  it("吉方位と凶方位は同じ方位に重複しない", () => {
    const s = buildMonthlyStructured(
      { birthDate: "1990-05-17", birthTime: null, date: "2026-07-23" },
      calendar,
    );
    const good = new Set(s.goodDirections.map((d) => d.direction));
    const bad = new Set(s.badDirections.map((d) => d.direction));
    for (const d of good) {
      expect(bad.has(d)).toBe(false);
    }
  });

  it("星番号は1〜9、方位ラベル・星名は既知集合、破は月破表記", () => {
    const s = buildMonthlyStructured(
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
      // 日破ではなく月破で表記されること(月盤なので)
      expect(b.misfortunes).not.toContain("日破");
    }
  });
});
