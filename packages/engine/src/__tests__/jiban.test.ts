import { describe, expect, it } from "vitest";
import { judgeDirections } from "../kigaku/direction.js";
import {
  HOUR_PERIODS,
  computeDayHourBans,
  computeHourBan,
  computeHourCenterStar,
  getHourPeriodByTime,
  getHourPeriodIndex,
} from "../kigaku/jiban.js";

// 十二支番号: 子=0, 丑=1, 寅=2, 卯=3, 辰=4, 巳=5, 午=6, 未=7, 申=8, 酉=9, 戌=10, 亥=11
const NE = 0; // 子
const USHI = 1; // 丑
const TORA = 2; // 寅
const U = 3; // 卯
const TATSU = 4; // 辰
const MI = 5; // 巳
const UMA = 6; // 午
const HITSUJI = 7; // 未
const SARU = 8; // 申
const TORI = 9; // 酉
const INU = 10; // 戌
const I = 11; // 亥

describe("時盤: 子刻の中宮星(確定仕様の対応表)", () => {
  it("陽遁: 子午卯酉の日 → 一白(1)", () => {
    for (const junishi of [NE, UMA, U, TORI]) {
      expect(computeHourCenterStar(junishi, "youton", 0)).toBe(1);
    }
  });

  it("陽遁: 寅申巳亥の日 → 七赤(7)", () => {
    for (const junishi of [TORA, SARU, MI, I]) {
      expect(computeHourCenterStar(junishi, "youton", 0)).toBe(7);
    }
  });

  it("陽遁: 辰戌丑未の日 → 四緑(4)", () => {
    for (const junishi of [TATSU, INU, USHI, HITSUJI]) {
      expect(computeHourCenterStar(junishi, "youton", 0)).toBe(4);
    }
  });

  it("陰遁: 子午卯酉の日 → 九紫(9)", () => {
    for (const junishi of [NE, UMA, U, TORI]) {
      expect(computeHourCenterStar(junishi, "inton", 0)).toBe(9);
    }
  });

  it("陰遁: 寅申巳亥の日 → 三碧(3)", () => {
    for (const junishi of [TORA, SARU, MI, I]) {
      expect(computeHourCenterStar(junishi, "inton", 0)).toBe(3);
    }
  });

  it("陰遁: 辰戌丑未の日 → 六白(6)", () => {
    for (const junishi of [TATSU, INU, USHI, HITSUJI]) {
      expect(computeHourCenterStar(junishi, "inton", 0)).toBe(6);
    }
  });
});

describe("時盤: 刻ごとの順行・逆行", () => {
  it("陽遁は刻が進むごとに +1 する", () => {
    // 子午卯酉の日(子刻=一白)
    expect(computeHourCenterStar(NE, "youton", 0)).toBe(1);
    expect(computeHourCenterStar(NE, "youton", 1)).toBe(2);
    expect(computeHourCenterStar(NE, "youton", 2)).toBe(3);
  });

  it("陽遁は 9 の次が 1 に循環する", () => {
    // 子刻=一白 → 8 刻進むと九紫(9)、9 刻進むと一白(1)
    expect(computeHourCenterStar(NE, "youton", 8)).toBe(9);
    expect(computeHourCenterStar(NE, "youton", 9)).toBe(1);
  });

  it("陰遁は刻が進むごとに -1 する", () => {
    // 子午卯酉の日(子刻=九紫)
    expect(computeHourCenterStar(NE, "inton", 0)).toBe(9);
    expect(computeHourCenterStar(NE, "inton", 1)).toBe(8);
    expect(computeHourCenterStar(NE, "inton", 2)).toBe(7);
  });

  it("陰遁は 1 の前が 9 に循環する", () => {
    // 子刻=九紫 → 8 刻進むと一白(1)、9 刻進むと九紫(9)
    expect(computeHourCenterStar(NE, "inton", 8)).toBe(1);
    expect(computeHourCenterStar(NE, "inton", 9)).toBe(9);
  });

  it("不正な引数は例外にする(握りつぶさない)", () => {
    expect(() => computeHourCenterStar(12, "youton", 0)).toThrow();
    expect(() => computeHourCenterStar(0, "youton", 12)).toThrow();
  });
});

describe("時盤: 時刻 → 刻の変換", () => {
  it("子刻は 23:00〜翌 1:00(23 時台と 0 時台が同じ刻)", () => {
    expect(getHourPeriodIndex(23)).toBe(0);
    expect(getHourPeriodIndex(0)).toBe(0);
    expect(getHourPeriodByTime("23:30").index).toBe(0);
    expect(getHourPeriodByTime("00:30").index).toBe(0);
  });

  it("丑刻は 1:00〜3:00、寅刻は 3:00 から", () => {
    expect(getHourPeriodByTime("1:00").index).toBe(1);
    expect(getHourPeriodByTime("02:59").index).toBe(1);
    expect(getHourPeriodByTime("03:00").index).toBe(2);
  });

  it("亥刻は 21:00〜23:00", () => {
    expect(getHourPeriodIndex(21)).toBe(11);
    expect(getHourPeriodIndex(22)).toBe(11);
  });

  it("12 刻が定義され、ラベルと開始時刻が対応する", () => {
    expect(HOUR_PERIODS).toHaveLength(12);
    expect(HOUR_PERIODS[0]?.startHour).toBe(23);
    expect(HOUR_PERIODS[0]?.endHour).toBe(1);
    expect(HOUR_PERIODS[1]?.label).toBe("1:00〜3:00");
    expect(HOUR_PERIODS[11]?.label).toBe("21:00〜23:00");
  });

  it("不正な時刻は例外にする", () => {
    expect(() => getHourPeriodIndex(24)).toThrow();
    expect(() => getHourPeriodByTime("あ:00")).toThrow();
  });
});

describe("時盤: 盤の構築と方位判定", () => {
  it("中宮=五黄のとき五黄殺・暗剣殺が発生しない(日盤と同じ性質)", () => {
    // 陽遁・子午卯酉の日(子刻=一白)では 4 刻進むと五黄(5)が中宮になる
    const ban = computeHourBan(NE, "youton", 4);
    expect(ban.center).toBe(5);

    const results = judgeDirections(ban, 1, 6, 0);
    const all = results.flatMap((r) => r.misfortunes);
    expect(all).not.toContain("goou_satsu");
    expect(all).not.toContain("anken_satsu");
  });

  it("中宮が五黄でなければ五黄殺・暗剣殺が発生する(判定が効いていることの確認)", () => {
    const ban = computeHourBan(NE, "youton", 0); // 中宮=一白
    expect(ban.center).toBe(1);

    const all = judgeDirections(ban, 1, 6, 0).flatMap((r) => r.misfortunes);
    expect(all).toContain("goou_satsu");
    expect(all).toContain("anken_satsu");
  });

  it("破は渡した十二支(=刻の十二支)で判定される", () => {
    const ban = computeHourBan(NE, "youton", 1); // 丑刻
    const period = HOUR_PERIODS[1];
    if (!period) throw new Error("period not found");

    // 破は "saiha" で返り、年破/月破/日破/時破の区別は呼び出し元の責務。
    // 刻の十二支を渡した場合と、別の十二支を渡した場合で破の方位が変わる。
    const withUshi = judgeDirections(ban, 1, 6, period.index);
    const withNe = judgeDirections(ban, 1, 6, 0);
    const haOf = (rs: typeof withUshi) =>
      rs.filter((r) => r.misfortunes.includes("saiha")).map((r) => r.direction);

    expect(haOf(withUshi)).toHaveLength(1);
    expect(haOf(withNe)).toHaveLength(1);
    expect(haOf(withUshi)).not.toEqual(haOf(withNe));
  });

  it("1 日分(12 刻)を index 順に返す", () => {
    const bans = computeDayHourBans(NE, "youton");
    expect(bans).toHaveLength(12);
    expect(bans[0]?.center).toBe(1);
    expect(bans[1]?.center).toBe(2);
    expect(bans[0]?.period.index).toBe(0);
    expect(bans[11]?.period.index).toBe(11);
    // 盤の中宮が center と一致する
    for (const b of bans) {
      expect(b.ban.center).toBe(b.center);
    }
  });
});
