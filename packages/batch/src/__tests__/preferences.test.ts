import { describe, expect, it } from "vitest";
import type { UserPreferences } from "../daily/preferences.js";
import {
  DEFAULT_HOLIDAY_WEEKDAYS,
  EMPTY_JOURNAL_SETTINGS,
  FAVORITE_PLACES_LIMIT,
  TRANSPORT_DISTANCE,
  isHoliday,
  isHolidayWeekdays,
  isTimeOfDay,
  isTransportMode,
  resolvePlacesDistance,
  resolveSchedulePreferences,
  transportLabel,
  weekdayOf,
} from "../daily/preferences.js";

const envDefault = { offsetKm: 3, radiusMeters: 1500 };

/** テスト用に UserPreferences を組み立てる(未指定は null=未設定) */
function prefs(partial: Partial<UserPreferences> = {}): UserPreferences {
  return {
    wakeTime: null,
    sleepTime: null,
    transportMode: null,
    holidayWeekdays: null,
    ...partial,
  };
}

describe("入力検証(API の検証と共有する純関数)", () => {
  it("isTimeOfDay は HH:MM(00:00〜23:59)のみ許可する", () => {
    expect(isTimeOfDay("00:00")).toBe(true);
    expect(isTimeOfDay("07:30")).toBe(true);
    expect(isTimeOfDay("23:59")).toBe(true);
    expect(isTimeOfDay("24:00")).toBe(false);
    expect(isTimeOfDay("07:60")).toBe(false);
    expect(isTimeOfDay("7:30")).toBe(false);
    expect(isTimeOfDay("0730")).toBe(false);
    expect(isTimeOfDay(730)).toBe(false);
    expect(isTimeOfDay(null)).toBe(false);
  });

  it("isTransportMode は 4 種類のみ許可する", () => {
    expect(isTransportMode("walk")).toBe(true);
    expect(isTransportMode("bike")).toBe(true);
    expect(isTransportMode("train")).toBe(true);
    expect(isTransportMode("car")).toBe(true);
    expect(isTransportMode("plane")).toBe(false);
    expect(isTransportMode("")).toBe(false);
    expect(isTransportMode(null)).toBe(false);
  });

  it("isHolidayWeekdays は 0〜6 の整数配列(重複なし)のみ許可する", () => {
    expect(isHolidayWeekdays([])).toBe(true);
    expect(isHolidayWeekdays([0, 6])).toBe(true);
    expect(isHolidayWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe(true);
    expect(isHolidayWeekdays([7])).toBe(false);
    expect(isHolidayWeekdays([-1])).toBe(false);
    expect(isHolidayWeekdays([0, 0])).toBe(false);
    expect(isHolidayWeekdays([1.5])).toBe(false);
    expect(isHolidayWeekdays(["0"])).toBe(false);
    expect(isHolidayWeekdays("0,6")).toBe(false);
  });
});

describe("weekdayOf(タイムゾーン非依存)", () => {
  it("0=日 … 6=土 を返す", () => {
    expect(weekdayOf("2026-08-02")).toBe(0); // 日
    expect(weekdayOf("2026-08-03")).toBe(1); // 月
    expect(weekdayOf("2026-07-30")).toBe(4); // 木
    expect(weekdayOf("2026-08-01")).toBe(6); // 土
  });

  it("うるう年の 2/29 も正しく扱う", () => {
    expect(weekdayOf("2024-02-29")).toBe(4); // 木
  });

  it("形式不正は throw する(握りつぶさない)", () => {
    expect(() => weekdayOf("2026/08/02")).toThrow();
    expect(() => weekdayOf("")).toThrow();
  });
});

describe("isHoliday(休日にする曜日の判定)", () => {
  it("既定は土日(設定なし・holidayWeekdays 未設定のどちらでも)", () => {
    expect(DEFAULT_HOLIDAY_WEEKDAYS).toEqual([0, 6]);
    // 設定行なし
    expect(isHoliday("2026-08-01", null)).toBe(true); // 土
    expect(isHoliday("2026-08-02", null)).toBe(true); // 日
    expect(isHoliday("2026-08-03", null)).toBe(false); // 月
    expect(isHoliday("2026-07-30", undefined)).toBe(false); // 木
    // 行はあるが holidayWeekdays 未設定
    expect(isHoliday("2026-08-01", prefs())).toBe(true);
    expect(isHoliday("2026-08-03", prefs())).toBe(false);
  });

  it("カスタム設定(水・木を休日)が反映される", () => {
    const p = prefs({ holidayWeekdays: [3, 4] });
    expect(isHoliday("2026-07-30", p)).toBe(true); // 木 → 休日
    expect(isHoliday("2026-08-01", p)).toBe(false); // 土 → 平日扱い
    expect(isHoliday("2026-08-02", p)).toBe(false); // 日 → 平日扱い
  });

  it("空配列(休日なし)を明示設定できる", () => {
    const p = prefs({ holidayWeekdays: [] });
    expect(isHoliday("2026-08-01", p)).toBe(false);
    expect(isHoliday("2026-08-02", p)).toBe(false);
  });
});

describe("resolvePlacesDistance(移動手段 → 距離パラメータ)", () => {
  it("確定仕様の距離が定義されている(徒歩1km/800m・自転車3km/1500m・電車5km/2000m・車10km/3000m)", () => {
    expect(TRANSPORT_DISTANCE.walk).toEqual({ offsetKm: 1, radiusMeters: 800 });
    expect(TRANSPORT_DISTANCE.bike).toEqual({ offsetKm: 3, radiusMeters: 1500 });
    expect(TRANSPORT_DISTANCE.train).toEqual({ offsetKm: 5, radiusMeters: 2000 });
    expect(TRANSPORT_DISTANCE.car).toEqual({ offsetKm: 10, radiusMeters: 3000 });
  });

  it("ユーザー設定があれば移動手段の距離を優先する", () => {
    expect(resolvePlacesDistance(prefs({ transportMode: "walk" }), envDefault)).toEqual({
      offsetKm: 1,
      radiusMeters: 800,
    });
    expect(resolvePlacesDistance(prefs({ transportMode: "car" }), envDefault)).toEqual({
      offsetKm: 10,
      radiusMeters: 3000,
    });
  });

  it("未設定なら env 既定へフォールバックする", () => {
    expect(resolvePlacesDistance(null, envDefault)).toEqual(envDefault);
    expect(resolvePlacesDistance(undefined, envDefault)).toEqual(envDefault);
    expect(resolvePlacesDistance(prefs(), envDefault)).toEqual(envDefault);
    // env 側の値が既定と違ってもそれが使われる
    expect(resolvePlacesDistance(prefs(), { offsetKm: 7, radiusMeters: 999 })).toEqual({
      offsetKm: 7,
      radiusMeters: 999,
    });
  });
});

describe("resolveSchedulePreferences", () => {
  it("設定なしでも壊れず、休日判定だけが既定(土日)で決まる", () => {
    const r = resolveSchedulePreferences("2026-07-30", null);
    expect(r.wakeTime).toBeNull();
    expect(r.sleepTime).toBeNull();
    expect(r.transportMode).toBeNull();
    expect(r.isHoliday).toBe(false); // 木
  });

  it("設定値をそのまま解決する", () => {
    const r = resolveSchedulePreferences(
      "2026-08-01",
      prefs({ wakeTime: "06:30", sleepTime: "22:00", transportMode: "train" }),
    );
    expect(r).toEqual({
      wakeTime: "06:30",
      sleepTime: "22:00",
      transportMode: "train",
      isHoliday: true, // 土
    });
  });
});

describe("定数・ラベル", () => {
  it("お気に入り地点の上限は 10 件", () => {
    expect(FAVORITE_PLACES_LIMIT).toBe(10);
  });

  it("EMPTY_JOURNAL_SETTINGS は設定なしを表す", () => {
    expect(EMPTY_JOURNAL_SETTINGS.preferences).toBeNull();
    expect(EMPTY_JOURNAL_SETTINGS.favoritePlaces).toEqual([]);
  });

  it("移動手段の日本語ラベル", () => {
    expect(transportLabel("walk")).toBe("徒歩");
    expect(transportLabel("bike")).toBe("自転車");
    expect(transportLabel("train")).toBe("電車");
    expect(transportLabel("car")).toBe("車");
  });
});
