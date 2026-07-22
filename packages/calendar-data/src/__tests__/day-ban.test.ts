import { describe, expect, it } from "vitest";
import type { StarNumber } from "@mj/engine";

import { getDayCenterStar, getTransitionDates } from "../day-ban.js";

// ── 陽遁・陰遁切替日(yakumoin.info 検証) ────────────────────

describe("陽遁・陰遁切替日 (getTransitionDates)", () => {
  it("2026年: 陽遁始め=2025-12-21, 陰遁始め=2026-06-19", () => {
    const t = getTransitionDates(2026);
    expect(t.youtonStart).toBe("2025-12-21");
    expect(t.intonStart).toBe("2026-06-19");
  });

  it("2027年: 陽遁始め=2026-12-16(yakumoin.info確認済み)", () => {
    const t = getTransitionDates(2027);
    expect(t.youtonStart).toBe("2026-12-16");
  });

  it("切替日は必ず甲子(60日周期)である", () => {
    // yakumoin.info 確認済み: 2026-06-19 = 甲子
    const baseJd = julianDay(2026, 6, 19);

    for (const year of [2024, 2025, 2026, 2027, 2028, 2030, 2035]) {
      const t = getTransitionDates(year);

      const youtonJd = julianDayFromStr(t.youtonStart);
      const intonJd = julianDayFromStr(t.intonStart);

      expect(Math.abs((youtonJd - baseJd) % 60)).toBe(0);
      expect(Math.abs((intonJd - baseJd) % 60)).toBe(0);
    }
  });

  it("陽遁始めと陰遁始めは必ず180日(60×3)離れている", () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      const t = getTransitionDates(year);
      const youtonJd = julianDayFromStr(t.youtonStart);
      const intonJd = julianDayFromStr(t.intonStart);
      expect(intonJd - youtonJd).toBe(180);
    }
  });

  it("陽遁始めは前年12月前後、陰遁始めは6月前後", () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      const t = getTransitionDates(year);
      const youtonMonth = Number(t.youtonStart.split("-")[1]);
      const intonMonth = Number(t.intonStart.split("-")[1]);

      // 陽遁始め: 11月〜1月の範囲に収まるはず
      expect(youtonMonth === 11 || youtonMonth === 12 || youtonMonth === 1).toBe(true);
      // 陰遁始め: 5月〜7月の範囲に収まるはず
      expect(intonMonth >= 5 && intonMonth <= 7).toBe(true);
    }
  });
});

// ── 日盤中宮星(yakumoin.info 2026年データとの突合) ──────────

describe("日盤中宮星 (getDayCenterStar) — yakumoin.info 2026年検証", () => {
  // 陽遁期間(2025-12-21 ~ 2026-06-18)
  describe("陽遁期間", () => {
    it("陽遁始め 2025-12-21 → 一白(1)", () => {
      expect(getDayCenterStar("2025-12-21")).toBe(1);
    });

    it("2025-12-22 → 二黒(2)", () => {
      expect(getDayCenterStar("2025-12-22")).toBe(2);
    });

    it("2026-02-04(立春) → 一白(1)", () => {
      expect(getDayCenterStar("2026-02-04")).toBe(1);
    });

    it("2026-02-05 → 二黒(2)", () => {
      expect(getDayCenterStar("2026-02-05")).toBe(2);
    });

    it("2026-02-06 → 三碧(3)", () => {
      expect(getDayCenterStar("2026-02-06")).toBe(3);
    });

    it("陽遁最終日 2026-06-18 → 九紫(9)", () => {
      expect(getDayCenterStar("2026-06-18")).toBe(9);
    });
  });

  // 陰遁期間(2026-06-19 ~ 2026-12-15)
  describe("陰遁期間", () => {
    it("陰遁始め 2026-06-19 → 九紫(9)", () => {
      expect(getDayCenterStar("2026-06-19")).toBe(9);
    });

    it("2026-06-20 → 八白(8)", () => {
      expect(getDayCenterStar("2026-06-20")).toBe(8);
    });

    it("2026-06-21 → 七赤(7)", () => {
      expect(getDayCenterStar("2026-06-21")).toBe(7);
    });

    it("陰遁最終日 2026-12-15 → 一白(1)", () => {
      expect(getDayCenterStar("2026-12-15")).toBe(1);
    });
  });

  // 陽遁→陰遁の切替で中宮星が繰り返される
  describe("切替日の中宮星が連続する", () => {
    it("6/18(陽遁末)と6/19(陰遁始め)はどちらも九紫(9)", () => {
      expect(getDayCenterStar("2026-06-18")).toBe(9);
      expect(getDayCenterStar("2026-06-19")).toBe(9);
    });

    it("12/15(陰遁末)と12/16(陽遁始め)はどちらも一白(1)", () => {
      expect(getDayCenterStar("2026-12-15")).toBe(1);
      expect(getDayCenterStar("2026-12-16")).toBe(1);
    });
  });

  // 7月の連続データ(陰遁 -1/日)
  describe("7月連続データ(陰遁)", () => {
    const julyData: Array<[string, StarNumber]> = [
      ["2026-07-07", 9],
      ["2026-07-08", 8],
      ["2026-07-09", 7],
      ["2026-07-10", 6],
      ["2026-07-11", 5],
      ["2026-07-12", 4],
      ["2026-07-13", 3],
      ["2026-07-14", 2],
      ["2026-07-15", 1],
      ["2026-07-16", 9],
      ["2026-07-17", 8],
      ["2026-07-18", 7],
      ["2026-07-19", 6],
      ["2026-07-20", 5],
      ["2026-07-21", 4],
      ["2026-07-22", 3],
      ["2026-07-23", 2],
      ["2026-07-24", 1],
      ["2026-07-25", 9],
    ];

    it.each(julyData)("%s → %i", (date, expected) => {
      expect(getDayCenterStar(date)).toBe(expected);
    });
  });

  // 2月の連続データ(陽遁 +1/日)
  describe("2月連続データ(陽遁)", () => {
    const febData: Array<[string, StarNumber]> = [
      ["2026-02-04", 1],
      ["2026-02-05", 2],
      ["2026-02-06", 3],
      ["2026-02-07", 4],
      ["2026-02-08", 5],
      ["2026-02-09", 6],
      ["2026-02-10", 7],
      ["2026-02-11", 8],
      ["2026-02-12", 9],
      ["2026-02-13", 1],
      ["2026-02-14", 2],
    ];

    it.each(febData)("%s → %i", (date, expected) => {
      expect(getDayCenterStar(date)).toBe(expected);
    });
  });

  // 12月の陽遁復帰データ
  describe("12月の陽遁復帰", () => {
    it("2026-12-16(陽遁始め) → 一白(1)", () => {
      expect(getDayCenterStar("2026-12-16")).toBe(1);
    });

    it("2026-12-17 → 二黒(2)", () => {
      expect(getDayCenterStar("2026-12-17")).toBe(2);
    });

    it("2026-12-24 → 九紫(9)", () => {
      expect(getDayCenterStar("2026-12-24")).toBe(9);
    });

    it("2026-12-25 → 一白(1)", () => {
      expect(getDayCenterStar("2026-12-25")).toBe(1);
    });
  });
});

// ── 中宮星の範囲チェック ────────────────────────────────────

describe("中宮星の範囲", () => {
  it("任意の日付で 1〜9 の範囲に収まる", () => {
    const dates = [
      "2024-01-01", "2024-06-15", "2024-12-31",
      "2025-03-20", "2025-09-23",
      "2026-01-01", "2026-07-22", "2026-12-31",
      "2027-02-04", "2027-08-15",
    ];
    for (const d of dates) {
      const star = getDayCenterStar(d);
      expect(star).toBeGreaterThanOrEqual(1);
      expect(star).toBeLessThanOrEqual(9);
    }
  });

  it("9日周期で中宮星が循環する", () => {
    // 陽遁期間の任意の9日間で1〜9がすべて出現する
    const stars = new Set<number>();
    // 2026-02-04 から9日間(陽遁)
    for (let d = 4; d <= 12; d++) {
      const date = `2026-02-${String(d).padStart(2, "0")}`;
      stars.add(getDayCenterStar(date));
    }
    expect(stars.size).toBe(9);
  });
});

// ── ヘルパー ────────────────────────────────────────────────

function julianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function julianDayFromStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return julianDay(y, m, d);
}
