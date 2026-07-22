import { describe, expect, it } from "vitest";
import type {
  Ban,
  CalendarProvider,
  Direction8,
  SekkiriBoundary,
  StarNumber,
} from "../types.js";
import {
  computeHonmeiStar,
  computeGetsumeiStar,
  starToGogyo,
  kigakuProfileModule,
} from "../kigaku/honmei.js";
import {
  buildBan,
  getOppositeDirection,
  JYOUI_POSITIONS,
} from "../kigaku/ban.js";
import {
  judgeDirections,
  isShojo,
  isBiwa,
  isSokoku,
  kigakuDirectionModule,
} from "../kigaku/direction.js";

// ── CalendarProvider モック ──────────────────────────────────

/**
 * テスト用の CalendarProvider モック。
 * 節入り日は簡易的な固定値(年により +-1 日のずれがあるが、テストでは固定)。
 */
function createMockCalendar(
  overrides?: Partial<CalendarProvider>,
): CalendarProvider {
  return {
    getSekkiriBoundaries: (year: number): readonly SekkiriBoundary[] => [
      { month: 2, date: `${String(year)}-02-04` },   // 立春
      { month: 3, date: `${String(year)}-03-06` },   // 啓蟄
      { month: 4, date: `${String(year)}-04-05` },   // 清明
      { month: 5, date: `${String(year)}-05-06` },   // 立夏
      { month: 6, date: `${String(year)}-06-06` },   // 芒種
      { month: 7, date: `${String(year)}-07-07` },   // 小暑
      { month: 8, date: `${String(year)}-08-08` },   // 立秋
      { month: 9, date: `${String(year)}-09-08` },   // 白露
      { month: 10, date: `${String(year)}-10-08` },  // 寒露
      { month: 11, date: `${String(year)}-11-07` },  // 立冬
      { month: 12, date: `${String(year)}-12-07` },  // 大雪
      { month: 1, date: `${String(year)}-01-06` },   // 小寒
    ],
    getYearBan: (year: number): Ban => {
      // 年の中宮星を計算(本命星と同じ計算式)
      let n = year % 9;
      if (n === 0) n = 9;
      let star = 11 - n;
      if (star === 10) star = 1;
      return buildBan(star as StarNumber);
    },
    getMonthBan: (): Ban => buildBan(5),
    getDayBan: (): Ban => buildBan(5),
    getYearJunishi: (): number => 0,
    getMonthJunishi: (): number => 0,
    getDayJunishi: (): number => 0,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// 本命星テスト
// ══════════════════════════════════════════════════════════════

describe("computeHonmeiStar", () => {
  const calendar = createMockCalendar();

  it("CLAUDE.md 検算: 1988年生(立春後) -> 三碧(3)", () => {
    expect(computeHonmeiStar("1988-04-15", calendar)).toBe(3);
  });

  it("CLAUDE.md 検算: 1990年生 -> 一白(1)", () => {
    expect(computeHonmeiStar("1990-05-17", calendar)).toBe(1);
  });

  it("CLAUDE.md 検算: 2026年 -> 一白(1)", () => {
    expect(computeHonmeiStar("2026-07-22", calendar)).toBe(1);
  });

  it("1989年生(立春後) -> 二黒(2)", () => {
    expect(computeHonmeiStar("1989-03-15", calendar)).toBe(2);
  });

  it("2024年生(立春後) -> 三碧(3)", () => {
    expect(computeHonmeiStar("2024-06-01", calendar)).toBe(3);
  });

  it("2025年生(立春後) -> 二黒(2)", () => {
    expect(computeHonmeiStar("2025-04-01", calendar)).toBe(2);
  });
});

// ── 立春境界テスト ──────────────────────────────────────────

describe("立春境界", () => {
  const calendar = createMockCalendar();

  it("立春前日(2024-02-03)は前年(2023年)扱い", () => {
    // 2023年の本命星: 2023 % 9 = 7, 11 - 7 = 4(四緑)
    expect(computeHonmeiStar("2024-02-03", calendar)).toBe(4);
  });

  it("立春当日(2024-02-04)は当年(2024年)扱い", () => {
    // 2024年の本命星: 2024 % 9 = 8, 11 - 8 = 3(三碧)
    expect(computeHonmeiStar("2024-02-04", calendar)).toBe(3);
  });

  it("立春翌日(2024-02-05)は当年(2024年)扱い", () => {
    expect(computeHonmeiStar("2024-02-05", calendar)).toBe(3);
  });

  it("1月生まれ(2024-01-15)は前年(2023年)扱い", () => {
    expect(computeHonmeiStar("2024-01-15", calendar)).toBe(4);
  });
});

// ══════════════════════════════════════════════════════════════
// 月命星テスト
// ══════════════════════════════════════════════════════════════

describe("computeGetsumeiStar", () => {
  const calendar = createMockCalendar();

  it("本命星1(一白) -> 寅月起点8、寅月の月命星=8", () => {
    // 寅月 = 2月。テスト日付: 2024-02-15(立春後、啓蟄前)
    const star = computeGetsumeiStar(1, "2024-02-15", calendar);
    expect(star).toBe(8);
  });

  it("本命星1 -> 卯月(3月)の月命星=7(1ずつ減算)", () => {
    const star = computeGetsumeiStar(1, "2024-03-10", calendar);
    expect(star).toBe(7);
  });

  it("本命星1 -> 辰月(4月)の月命星=6", () => {
    const star = computeGetsumeiStar(1, "2024-04-10", calendar);
    expect(star).toBe(6);
  });

  it("本命星1 -> 巳月(5月)の月命星=5", () => {
    const star = computeGetsumeiStar(1, "2024-05-10", calendar);
    expect(star).toBe(5);
  });

  it("月が進むごとに1ずつ減算されること(一白グループ全月確認)", () => {
    const expected: Record<number, StarNumber> = {
      2: 8, // 寅月
      3: 7, // 卯月
      4: 6, // 辰月
      5: 5, // 巳月
      6: 4, // 午月
      7: 3, // 未月
      8: 2, // 申月
      9: 1, // 酉月
      10: 9, // 戌月(1の次は9に循環)
      11: 8, // 亥月
      12: 7, // 子月
      1: 6,  // 丑月
    };

    // 各月の中間日でテスト(2024年)
    const testDates: Record<number, string> = {
      2: "2024-02-15",
      3: "2024-03-15",
      4: "2024-04-15",
      5: "2024-05-15",
      6: "2024-06-15",
      7: "2024-07-15",
      8: "2024-08-15",
      9: "2024-09-15",
      10: "2024-10-15",
      11: "2024-11-15",
      12: "2024-12-15",
      1: "2025-01-15",
    };

    for (const [month, date] of Object.entries(testDates)) {
      const star = computeGetsumeiStar(1, date, calendar);
      expect(star).toBe(expected[Number(month)]);
    }
  });

  it("本命星3(三碧)の寅月起点=5", () => {
    const star = computeGetsumeiStar(3, "2024-02-15", calendar);
    expect(star).toBe(5);
  });

  it("本命星2(二黒)の寅月起点=2", () => {
    const star = computeGetsumeiStar(2, "2024-02-15", calendar);
    expect(star).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// starToGogyo テスト
// ══════════════════════════════════════════════════════════════

describe("starToGogyo", () => {
  it("全9星の五行が正しい", () => {
    expect(starToGogyo(1)).toBe("water");
    expect(starToGogyo(2)).toBe("earth");
    expect(starToGogyo(3)).toBe("wood");
    expect(starToGogyo(4)).toBe("wood");
    expect(starToGogyo(5)).toBe("earth");
    expect(starToGogyo(6)).toBe("metal");
    expect(starToGogyo(7)).toBe("metal");
    expect(starToGogyo(8)).toBe("earth");
    expect(starToGogyo(9)).toBe("fire");
  });
});

// ══════════════════════════════════════════════════════════════
// 盤配置テスト
// ══════════════════════════════════════════════════════════════

describe("buildBan", () => {
  it("中宮=5(五黄)のとき後天定位盤に一致する", () => {
    const ban = buildBan(5);
    expect(ban.center).toBe(5);
    expect(ban.positions).toEqual({
      SE: 4,
      S: 9,
      SW: 2,
      E: 3,
      W: 7,
      NE: 8,
      N: 1,
      NW: 6,
    });
  });

  it("中宮=1の配置が正しい", () => {
    const ban = buildBan(1);
    expect(ban.center).toBe(1);
    // 配置順: NW, W, NE, S, N, SW, E, SE に +1 ずつ
    // center=1 → NW=2, W=3, NE=4, S=5, N=6, SW=7, E=8, SE=9
    expect(ban.positions).toEqual({
      NW: 2,
      W: 3,
      NE: 4,
      S: 5,
      N: 6,
      SW: 7,
      E: 8,
      SE: 9,
    });
  });

  it("中宮=9の配置が正しい(9→1に循環)", () => {
    const ban = buildBan(9);
    expect(ban.center).toBe(9);
    // center=9 → NW=1, W=2, NE=3, S=4, N=5, SW=6, E=7, SE=8
    expect(ban.positions).toEqual({
      NW: 1,
      W: 2,
      NE: 3,
      S: 4,
      N: 5,
      SW: 6,
      E: 7,
      SE: 8,
    });
  });

  it("すべての中宮星(1〜9)で全9星が配置される", () => {
    for (let center = 1; center <= 9; center++) {
      const ban = buildBan(center as StarNumber);
      const allStars = new Set<number>([ban.center]);
      for (const dir of ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const) {
        allStars.add(ban.positions[dir]);
      }
      expect(allStars.size).toBe(9);
    }
  });
});

describe("getOppositeDirection", () => {
  it("N <-> S", () => {
    expect(getOppositeDirection("N")).toBe("S");
    expect(getOppositeDirection("S")).toBe("N");
  });

  it("NE <-> SW", () => {
    expect(getOppositeDirection("NE")).toBe("SW");
    expect(getOppositeDirection("SW")).toBe("NE");
  });

  it("E <-> W", () => {
    expect(getOppositeDirection("E")).toBe("W");
    expect(getOppositeDirection("W")).toBe("E");
  });

  it("SE <-> NW", () => {
    expect(getOppositeDirection("SE")).toBe("NW");
    expect(getOppositeDirection("NW")).toBe("SE");
  });
});

// ══════════════════════════════════════════════════════════════
// 五行関係テスト
// ══════════════════════════════════════════════════════════════

describe("五行関係", () => {
  describe("isShojo (相生)", () => {
    it("木→火は相生", () => expect(isShojo("wood", "fire")).toBe(true));
    it("火→土は相生", () => expect(isShojo("fire", "earth")).toBe(true));
    it("土→金は相生", () => expect(isShojo("earth", "metal")).toBe(true));
    it("金→水は相生", () => expect(isShojo("metal", "water")).toBe(true));
    it("水→木は相生", () => expect(isShojo("water", "wood")).toBe(true));
    it("逆方向も相生(火→木)", () => expect(isShojo("fire", "wood")).toBe(true));
    it("木と土は相生ではない", () => expect(isShojo("wood", "earth")).toBe(false));
    it("同一五行は相生ではない", () => expect(isShojo("wood", "wood")).toBe(false));
  });

  describe("isBiwa (比和)", () => {
    it("同一五行はtrue", () => expect(isBiwa("wood", "wood")).toBe(true));
    it("異なる五行はfalse", () => expect(isBiwa("wood", "fire")).toBe(false));
  });

  describe("isSokoku (相剋)", () => {
    it("木剋土", () => expect(isSokoku("wood", "earth")).toBe(true));
    it("土剋水", () => expect(isSokoku("earth", "water")).toBe(true));
    it("水剋火", () => expect(isSokoku("water", "fire")).toBe(true));
    it("火剋金", () => expect(isSokoku("fire", "metal")).toBe(true));
    it("金剋木", () => expect(isSokoku("metal", "wood")).toBe(true));
    it("逆方向も相剋", () => expect(isSokoku("earth", "wood")).toBe(true));
    it("木と火は相剋ではない", () => expect(isSokoku("wood", "fire")).toBe(false));
  });
});

// ══════════════════════════════════════════════════════════════
// 方位判定テスト
// ══════════════════════════════════════════════════════════════

describe("judgeDirections", () => {
  it("五黄中宮のとき五黄殺・暗剣殺が発生しない", () => {
    const ban = buildBan(5); // 五黄中宮
    const results = judgeDirections(ban, 1, 8, 0);

    for (const r of results) {
      expect(r.misfortunes).not.toContain("goou_satsu");
      expect(r.misfortunes).not.toContain("anken_satsu");
    }
  });

  it("本命星中宮のとき本命殺が発生しない", () => {
    const ban = buildBan(3); // 三碧中宮
    const results = judgeDirections(ban, 3, 5, 0); // 本命星=3=中宮

    for (const r of results) {
      expect(r.misfortunes).not.toContain("honmei_satsu");
      expect(r.misfortunes).not.toContain("honmei_tekisatsu");
    }
  });

  it("月命星中宮のとき月命殺が発生しない", () => {
    const ban = buildBan(8); // 八白中宮
    const results = judgeDirections(ban, 1, 8, 0); // 月命星=8=中宮

    for (const r of results) {
      expect(r.misfortunes).not.toContain("getsumei_satsu");
      expect(r.misfortunes).not.toContain("getsumei_tekisatsu");
    }
  });

  it("五黄が特定方位にあるとき五黄殺と暗剣殺が正しく判定される", () => {
    // center=1 → 五黄(5)は南(S)に回座
    const ban = buildBan(1);
    expect(ban.positions["S"]).toBe(5);

    const results = judgeDirections(ban, 9, 6, 0);
    const south = results.find((r) => r.direction === "S")!;
    const north = results.find((r) => r.direction === "N")!;

    expect(south.misfortunes).toContain("goou_satsu");
    expect(north.misfortunes).toContain("anken_satsu");
  });

  it("破の判定: 十二支=0(子)のとき、子=北の反対=南が破", () => {
    const ban = buildBan(5);
    const results = judgeDirections(ban, 1, 8, 0); // junishi=0(子)

    const south = results.find((r) => r.direction === "S")!;
    expect(south.misfortunes).toContain("saiha");
  });

  it("破の判定: 十二支=6(午)のとき、午=南の反対=北が破", () => {
    const ban = buildBan(5);
    const results = judgeDirections(ban, 1, 8, 6); // junishi=6(午)

    const north = results.find((r) => r.direction === "N")!;
    expect(north.misfortunes).toContain("saiha");
  });

  it("定位対冲の検出: 一白(定位=北)が南に回座", () => {
    // center=4 の盤を確認: 一白がどこに回座するか
    // center=4 → NW=5, W=6, NE=7, S=8, N=9, SW=1, E=2, SE=3
    // 一白(1)は SW に回座。定位=N の反対=S。SW !== S なので対冲にならない。

    // center=6 → NW=7, W=8, NE=9, S=1, N=2, SW=3, E=4, SE=5
    // 一白(1)は S に回座。定位=N の反対=S。S === S なので定位対冲!
    const ban = buildBan(6);
    expect(ban.positions["S"]).toBe(1);

    const results = judgeDirections(ban, 3, 5, 0);
    const south = results.find((r) => r.direction === "S")!;
    expect(south.misfortunes).toContain("jouiTaichu");
  });

  it("定位対冲: 九紫(定位=南)が北に回座", () => {
    // center=4 → N=9 → 九紫の定位は南、反対は北。北に回座しているので対冲
    const ban = buildBan(4);
    expect(ban.positions["N"]).toBe(9);

    const results = judgeDirections(ban, 1, 8, 6);
    const north = results.find((r) => r.direction === "N")!;
    expect(north.misfortunes).toContain("jouiTaichu");
  });

  it("本命殺・本命的殺が正しく判定される", () => {
    // center=5(五黄中宮、後天定位盤)、本命星=3 → 三碧は東(E)
    const ban = buildBan(5);
    expect(ban.positions["E"]).toBe(3);

    const results = judgeDirections(ban, 3, 8, 0);
    const east = results.find((r) => r.direction === "E")!;
    const west = results.find((r) => r.direction === "W")!;

    expect(east.misfortunes).toContain("honmei_satsu");
    expect(west.misfortunes).toContain("honmei_tekisatsu");
  });

  it("相生の吉方位判定", () => {
    // center=5(後天定位盤)、本命星=1(水)、月命星=6(金)
    // 金→水は相生(金が水を生じる)
    // 方位上で金(6,7)の星を探す → 6=NW, 7=W
    // NW に六白(6=金)が回座、本命星1(水)と金→水で相生
    // ただし NW は本命殺でも月命殺でもない
    // 月命星6(金)は NW → 月命殺になるので、NW は凶
    // 7(W)は月命星6と相性を見る: 7(金)の五行=金、月命星6(金)=金 → 比和
    // W に七赤(7=金)、本命星1(水)と金→水で相生、月命星6(金)と金-金で比和
    // W は本命殺でない(本命星1は北)。月命殺でない(月命星6はNW)。
    // → W は great_fortune

    const ban = buildBan(5);
    const results = judgeDirections(ban, 1, 6, 6); // 午破=北が破

    const west = results.find((r) => r.direction === "W")!;
    // 7(金) → 1(水) は相生(金が水を生じる)
    // 7(金) → 6(金) は比和(同じ金)
    // → 本命と相生 AND 月命と比和(biwaTreatedAsGood=true) → great_fortune
    expect(west.fortune).toBe("great_fortune");
  });

  it("比和の吉扱い(biwaTreatedAsGood=true)", () => {
    // center=3 の盤:
    //   NW=4, W=5, NE=6, S=7, N=8, SW=9, E=1, SE=2
    // 本命星=2(土)→ SE に回座(本命殺=SE、本命的殺=NW)
    // 月命星=3(中宮、月命殺なし)
    // 五黄(5)は W → 五黄殺=W、暗剣殺=E
    // junishi=3(卯)→ 卯の方位=E、破=W
    // N に八白(8=土)が回座。本命星2(土)と比和。N は凶方位に該当しない。
    // → fortune
    const ban = buildBan(3);
    expect(ban.positions["N"]).toBe(8);

    const results = judgeDirections(ban, 2, 3, 3);
    const north = results.find((r) => r.direction === "N")!;
    expect(north.misfortunes).toHaveLength(0);
    expect(north.fortune).toBe("fortune");
  });

  it("比和を吉と扱わない場合(biwaTreatedAsGood=false)", () => {
    // 同じ盤設定で biwaTreatedAsGood=false
    const ban = buildBan(3);
    const results = judgeDirections(ban, 2, 3, 3, { biwaTreatedAsGood: false });
    const north = results.find((r) => r.direction === "N")!;
    expect(north.misfortunes).toHaveLength(0);
    expect(north.fortune).toBe("neutral");
  });

  it("凶方位にはfortune=misfortuneが設定される", () => {
    const ban = buildBan(1); // 五黄は南(S)
    const results = judgeDirections(ban, 9, 6, 0);
    const south = results.find((r) => r.direction === "S")!;
    expect(south.fortune).toBe("misfortune");
    expect(south.misfortunes.length).toBeGreaterThan(0);
  });

  it("結果は常に8方位分返る", () => {
    const ban = buildBan(5);
    const results = judgeDirections(ban, 1, 8, 0);
    expect(results).toHaveLength(8);

    const dirs = new Set(results.map((r) => r.direction));
    expect(dirs.size).toBe(8);
  });

  it("各結果にstarが盤上の星と一致する", () => {
    const ban = buildBan(3);
    const results = judgeDirections(ban, 1, 8, 0);
    for (const r of results) {
      expect(r.star).toBe(ban.positions[r.direction]);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// DiagnosisModule テスト
// ══════════════════════════════════════════════════════════════

describe("kigakuProfileModule", () => {
  it("id が 'kigaku_profile' である", () => {
    expect(kigakuProfileModule.id).toBe("kigaku_profile");
  });

  it("version が 1 である", () => {
    expect(kigakuProfileModule.version).toBe(1);
  });

  it("requiredInputs に birth_date が含まれる", () => {
    expect(kigakuProfileModule.requiredInputs).toContain("birth_date");
  });

  it("clientSafe が true である", () => {
    expect(kigakuProfileModule.clientSafe).toBe(true);
  });

  it("compute が honmeiStar と getsumeiStar を返す", () => {
    const calendar = createMockCalendar();
    const result = kigakuProfileModule.compute(
      { birthDate: "1990-05-17" },
      calendar,
    ) as { honmeiStar: StarNumber; getsumeiStar: StarNumber };
    expect(result.honmeiStar).toBe(1);
    expect(result).toHaveProperty("getsumeiStar");
  });
});

describe("kigakuDirectionModule", () => {
  it("id が 'kigaku_direction' である", () => {
    expect(kigakuDirectionModule.id).toBe("kigaku_direction");
  });

  it("clientSafe が false である", () => {
    expect(kigakuDirectionModule.clientSafe).toBe(false);
  });

  it("requiredInputs に birth_date と home_latlng が含まれる", () => {
    expect(kigakuDirectionModule.requiredInputs).toContain("birth_date");
    expect(kigakuDirectionModule.requiredInputs).toContain("home_latlng");
  });
});
