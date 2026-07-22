import { buildBan } from "@mj/engine";
import type { StarNumber } from "@mj/engine";
import { describe, expect, it } from "vitest";

import { getDayJunishi, getMonthJunishi, getYearJunishi } from "../junishi.js";
import { MasterCalendarProvider } from "../provider.js";
import { getMonthCenterStar, getYearCenterStar } from "../year-month-ban.js";

const provider = new MasterCalendarProvider();

// ── 年盤中宮星 ─────────────────────────────────────────────

describe("年盤中宮星 (getYearCenterStar)", () => {
  it.each([
    [2024, 3, "三碧"],
    [2025, 2, "二黒"],
    [2026, 1, "一白"],
    [2027, 9, "九紫"],
  ] as const)("%i年 → %s(%i)", (year, expected, _name) => {
    expect(getYearCenterStar(year)).toBe(expected);
  });
});

// ── 月盤中宮星 ─────────────────────────────────────────────

describe("月盤中宮星 (getMonthCenterStar)", () => {
  it("2026年(一白年グループ1,4,7)、寅月(2月) → 八白(8)", () => {
    expect(getMonthCenterStar(2026, 2)).toBe(8);
  });

  it("2026年、卯月(3月) → 七赤(7)", () => {
    expect(getMonthCenterStar(2026, 3)).toBe(7);
  });

  it("2026年、丑月(1月=最終月) → 正しく循環する", () => {
    // 寅月(2月)=8 から毎月-1: 8,7,6,5,4,3,2,1,9,8,7,6
    // 丑月(1月)は12番目 → 6
    const star = getMonthCenterStar(2026, 1);
    expect(star).toBe(6);
  });

  it("2026年の全12ヶ月が正しく循環する", () => {
    // 一白年(グループ1,4,7): 起点=八白(8)
    // 寅(2月)=8, 卯=7, 辰=6, 巳=5, 午=4, 未=3, 申=2, 酉=1, 戌=9, 亥=8, 子=7, 丑=6
    const expected: Record<number, StarNumber> = {
      2: 8,
      3: 7,
      4: 6,
      5: 5,
      6: 4,
      7: 3,
      8: 2,
      9: 1,
      10: 9,
      11: 8,
      12: 7,
      1: 6,
    };
    for (const [month, star] of Object.entries(expected)) {
      expect(getMonthCenterStar(2026, Number(month))).toBe(star);
    }
  });

  it("2024年(三碧年グループ3,6,9): 寅月=五黄(5)", () => {
    expect(getMonthCenterStar(2024, 2)).toBe(5);
  });

  it("2025年(二黒年グループ2,5,8): 寅月=二黒(2)", () => {
    expect(getMonthCenterStar(2025, 2)).toBe(2);
  });
});

// ── 気学上の年の判定 ────────────────────────────────────────

describe("気学上の年の判定 (getKigakuYear)", () => {
  it("2024-02-03 → 2023年扱い(立春前)", () => {
    expect(provider.getKigakuYear("2024-02-03")).toBe(2023);
  });

  it("2024-02-04 → 2024年扱い(立春当日)", () => {
    expect(provider.getKigakuYear("2024-02-04")).toBe(2024);
  });

  it("2025-02-02 → 2024年扱い", () => {
    expect(provider.getKigakuYear("2025-02-02")).toBe(2024);
  });

  it("2025-02-03 → 2025年扱い", () => {
    expect(provider.getKigakuYear("2025-02-03")).toBe(2025);
  });

  it("2026-02-03 → 2025年扱い(立春前)", () => {
    expect(provider.getKigakuYear("2026-02-03")).toBe(2025);
  });

  it("2026-02-04 → 2026年扱い(立春当日)", () => {
    expect(provider.getKigakuYear("2026-02-04")).toBe(2026);
  });

  it("2027-02-03 → 2026年扱い(立春前)", () => {
    expect(provider.getKigakuYear("2027-02-03")).toBe(2026);
  });

  it("2027-02-04 → 2027年扱い(立春当日)", () => {
    expect(provider.getKigakuYear("2027-02-04")).toBe(2027);
  });
});

// ── 気学上の月の判定 ────────────────────────────────────────

describe("気学上の月の判定 (getKigakuMonth)", () => {
  it("2026-02-03 → 丑月(1月)", () => {
    expect(provider.getKigakuMonth("2026-02-03")).toBe(1);
  });

  it("2026-02-04 → 寅月(2月)", () => {
    expect(provider.getKigakuMonth("2026-02-04")).toBe(2);
  });

  it("2026-03-04 → 寅月(2月)", () => {
    expect(provider.getKigakuMonth("2026-03-04")).toBe(2);
  });

  it("2026-03-05 → 卯月(3月)、啓蟄当日", () => {
    expect(provider.getKigakuMonth("2026-03-05")).toBe(3);
  });

  it("年末(12月)は大雪以降 → 子月(12月)", () => {
    // 2026-12-07 が大雪の節入り
    expect(provider.getKigakuMonth("2026-12-07")).toBe(12);
    expect(provider.getKigakuMonth("2026-12-31")).toBe(12);
  });

  it("年始(1月)で小寒前 → 前年の子月(12月)", () => {
    // 2026-01-05 が小寒。2026-01-04 は前年12月(大雪)以降。
    // 前年(2025)の大雪は 2025-12-07 → 2026-01-04 >= 2025-12-07 → 月12
    expect(provider.getKigakuMonth("2026-01-04")).toBe(12);
  });
});

// ── 年の十二支 ──────────────────────────────────────────────

describe("年の十二支 (getYearJunishi)", () => {
  it.each([
    [2024, 4, "辰"],
    [2025, 5, "巳"],
    [2026, 6, "午"],
    [2027, 7, "未"],
    [2023, 3, "卯"],
    [2020, 0, "子"],
  ] as const)("%i年 → %s(%i)", (year, expected, _name) => {
    expect(getYearJunishi(year)).toBe(expected);
  });
});

// ── 月の十二支 ──────────────────────────────────────────────

describe("月の十二支 (getMonthJunishi)", () => {
  it("寅月(2月) → 寅(2)", () => {
    expect(getMonthJunishi(2)).toBe(2);
  });

  it("卯月(3月) → 卯(3)", () => {
    expect(getMonthJunishi(3)).toBe(3);
  });

  it("子月(12月) → 子(0)", () => {
    expect(getMonthJunishi(12)).toBe(0);
  });

  it("丑月(1月) → 丑(1)", () => {
    expect(getMonthJunishi(1)).toBe(1);
  });
});

// ── 日の十二支 ──────────────────────────────────────────────

describe("日の十二支 (getDayJunishi) — yakumoin.info 検証", () => {
  it("2026-06-19(甲子) → 子(0)", () => {
    expect(getDayJunishi("2026-06-19")).toBe(0);
  });

  it("2026-06-20(乙丑) → 丑(1)", () => {
    expect(getDayJunishi("2026-06-20")).toBe(1);
  });

  it("2026-07-01(丙子) → 子(0)、12日周期の確認", () => {
    expect(getDayJunishi("2026-07-01")).toBe(0);
  });

  it("2026-07-22(丁酉) → 酉(9)", () => {
    expect(getDayJunishi("2026-07-22")).toBe(9);
  });

  it("前日は亥(11)", () => {
    expect(getDayJunishi("2026-06-18")).toBe(11);
  });

  it("基準日より遠い過去でも正しく計算される", () => {
    // 2026-06-19 から 60 日前 = 2026-04-20
    // 60 % 12 = 0 なので同じ十二支(子)
    expect(getDayJunishi("2026-04-20")).toBe(0);
  });
});

// ── 盤の構造 ────────────────────────────────────────────────

describe("盤の構造", () => {
  it("getYearBan(2026) が一白中宮の正しい盤を返す", () => {
    const ban = provider.getYearBan(2026);
    expect(ban.center).toBe(1);
    // 一白中宮の盤: buildBan(1) と一致するはず
    const expected = buildBan(1 as StarNumber);
    expect(ban).toEqual(expected);
  });

  it("getMonthBan(2026, 2) が八白中宮の正しい盤を返す", () => {
    const ban = provider.getMonthBan(2026, 2);
    expect(ban.center).toBe(8);
    const expected = buildBan(8 as StarNumber);
    expect(ban).toEqual(expected);
  });

  it("getYearBan で五黄中宮のとき後天定位盤に一致する", () => {
    // 五黄中宮の年を探す: yearCenterStar == 5
    // 2022: n=2022%9=6, star=11-6=5 → 五黄
    // テストデータ範囲外だが getYearBan は算出式なので計算可能
    const ban = provider.getYearBan(2022);
    expect(ban.center).toBe(5);
    // 後天定位盤の確認
    expect(ban.positions.N).toBe(1);
    expect(ban.positions.SW).toBe(2);
    expect(ban.positions.E).toBe(3);
    expect(ban.positions.SE).toBe(4);
    expect(ban.positions.NW).toBe(6);
    expect(ban.positions.W).toBe(7);
    expect(ban.positions.NE).toBe(8);
    expect(ban.positions.S).toBe(9);
  });

  it("getDayBan が正しい盤を返す (2026-07-22 = 三碧中宮)", () => {
    const ban = provider.getDayBan("2026-07-22");
    expect(ban.center).toBe(3);
    const expected = buildBan(3 as StarNumber);
    expect(ban).toEqual(expected);
  });
});

// ── CalendarProvider としての整合性 ──────────────────────────

describe("CalendarProvider としての整合性", () => {
  it("getSekkiriBoundaries は12件の境界を返す", () => {
    const boundaries = provider.getSekkiriBoundaries(2026);
    expect(boundaries).toHaveLength(12);
  });

  it("getSekkiriBoundaries の各 month は 1〜12 を網羅する", () => {
    const boundaries = provider.getSekkiriBoundaries(2026);
    const months = new Set(boundaries.map((b) => b.month));
    expect(months.size).toBe(12);
    for (let m = 1; m <= 12; m++) {
      expect(months.has(m)).toBe(true);
    }
  });

  it("範囲外の年はエラーを投げる", () => {
    expect(() => provider.getSekkiriBoundaries(1900)).toThrow("Sekki data not available");
  });

  it("getYearJunishi は CalendarProvider 経由で正しい値を返す", () => {
    expect(provider.getYearJunishi(2026)).toBe(6); // 午
  });

  it("getMonthJunishi は CalendarProvider 経由で正しい値を返す", () => {
    expect(provider.getMonthJunishi(2026, 2)).toBe(2); // 寅
  });

  it("getDayJunishi は CalendarProvider 経由で正しい値を返す", () => {
    // yakumoin.info 確認済み: 2026-06-19 = 甲子(子=0)
    expect(provider.getDayJunishi("2026-06-19")).toBe(0);
    // 2026-07-22 = 丁酉(酉=9)
    expect(provider.getDayJunishi("2026-07-22")).toBe(9);
  });
});

// ── 節入りデータの連続性 ────────────────────────────────────

describe("節入りデータの連続性", () => {
  it("各年の境界日が昇順に並ぶ", () => {
    for (const year of [2024, 2025, 2026, 2027]) {
      const boundaries = provider.getSekkiriBoundaries(year);
      const sorted = [...boundaries].sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
      );
      // 日付が厳密に昇順であること(重複なし)
      for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        const prev = sorted[i - 1];
        if (curr && prev) {
          expect(curr.date > prev.date).toBe(true);
        }
      }
    }
  });

  it("各年の立春が2月に含まれる", () => {
    for (const year of [2024, 2025, 2026, 2027]) {
      const boundaries = provider.getSekkiriBoundaries(year);
      const risshun = boundaries.find((b) => b.month === 2);
      expect(risshun).toBeDefined();
      expect(risshun?.date.slice(5, 7)).toBe("02");
    }
  });
});
