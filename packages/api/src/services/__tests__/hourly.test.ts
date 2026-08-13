/**
 * GET /api/today の `hourly`(時盤12刻)の応答整形。
 *
 * 時盤の計算そのものは engine 側でテスト済み(packages/engine)。ここでは
 * 「12刻を index 順で過不足なく返すこと」「破の判定に刻の十二支を渡していること」
 * といった API 層の整形責務だけを検証する(DB 非依存)。
 */

import { computeDayHourBans, computeHourCenterStar, judgeDirections } from "@mj/engine";
import { describe, expect, it } from "vitest";
import { buildHourlyDirections } from "../hourly.js";

const HONMEI = 1 as const;
const GETSUMEI = 6 as const;

describe("buildHourlyDirections", () => {
  it("12刻を index 順(0=子刻 … 11=亥刻)で返す", () => {
    const hourly = buildHourlyDirections(0, "youton", HONMEI, GETSUMEI);
    expect(hourly).toHaveLength(12);
    expect(hourly.map((h) => h.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("子刻(index=0)は 23:00〜1:00 で日をまたぐ", () => {
    const [first] = buildHourlyDirections(0, "youton", HONMEI, GETSUMEI);
    expect(first?.startHour).toBe(23);
    expect(first?.endHour).toBe(1);
    expect(first?.label).toBe("23:00〜1:00");
  });

  it("index=1 は丑刻 1:00〜3:00(UI の並び先頭)", () => {
    const hourly = buildHourlyDirections(0, "youton", HONMEI, GETSUMEI);
    expect(hourly[1]?.startHour).toBe(1);
    expect(hourly[1]?.endHour).toBe(3);
    expect(hourly[1]?.label).toBe("1:00〜3:00");
  });

  it("各刻は 8 方位ぶんの判定を持ち、中宮星は engine の算出値と一致する", () => {
    for (const tonpu of ["youton", "inton"] as const) {
      for (const dayJunishi of [0, 1, 2, 7, 11]) {
        const hourly = buildHourlyDirections(dayJunishi, tonpu, HONMEI, GETSUMEI);
        for (const h of hourly) {
          expect(h.directions).toHaveLength(8);
          expect(h.center).toBe(computeHourCenterStar(dayJunishi, tonpu, h.index));
        }
      }
    }
  });

  it("破の判定には日の十二支ではなく「その刻の十二支」を渡す", () => {
    const dayJunishi = 5; // 巳日(刻の十二支とわざとずらす)
    const hourly = buildHourlyDirections(dayJunishi, "youton", HONMEI, GETSUMEI);
    const bans = computeDayHourBans(dayJunishi, "youton");

    for (const h of hourly) {
      const ban = bans[h.index]?.ban;
      expect(ban).toBeDefined();
      if (!ban) continue;
      // period.index を十二支として渡した結果と一致すること
      expect(h.directions).toEqual(judgeDirections(ban, HONMEI, GETSUMEI, h.index, "hour"));
      // 日の十二支を渡した結果とは一致しない刻が存在する(取り違えの検出)
    }

    const withDayJunishi = hourly.map((h) => {
      const ban = bans[h.index]?.ban;
      return ban ? judgeDirections(ban, HONMEI, GETSUMEI, dayJunishi, "hour") : [];
    });
    const differs = hourly.some(
      (h, i) => JSON.stringify(h.directions) !== JSON.stringify(withDayJunishi[i]),
    );
    expect(differs).toBe(true);
  });
});
