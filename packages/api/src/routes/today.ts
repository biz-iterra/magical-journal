/**
 * GET /api/today
 *
 * 今日の日盤 + 方位判定 + daily_fortunes を返す。
 * 方位判定は engine を直接呼ぶ(保存済みのバッチ結果ではなくリアルタイム計算)。
 */

import { MasterCalendarProvider } from "@mj/calendar-data";
import { computeGetsumeiStar, computeHonmeiStar, judgeDirections } from "@mj/engine";
import { Hono } from "hono";
import { getDailyFortune, getProfile, getUserByLineId } from "../db/queries.js";
import type { AppEnv } from "../types.js";

const today = new Hono<AppEnv>();

/**
 * JST で今日の日付を "YYYY-MM-DD" 形式で返す。
 * Date オブジェクトのタイムゾーン依存を避けるため Intl を使用。
 */
function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

today.get("/", (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const prof = getProfile(user.id);
  if (!prof) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const dateStr = todayJST();
  const calendar = new MasterCalendarProvider();

  // 本命星・月命星の算出
  const honmeiStar = computeHonmeiStar(prof.birth_date, calendar);
  const getsumeiStar = computeGetsumeiStar(honmeiStar, prof.birth_date, calendar);

  // 日盤の取得と方位判定
  const dayBan = calendar.getDayBan(dateStr);
  const dayJunishi = calendar.getDayJunishi(dateStr);
  const directions = judgeDirections(dayBan, honmeiStar, getsumeiStar, dayJunishi);

  // 年盤・月盤も計算
  const kigakuYear = calendar.getKigakuYear(dateStr);
  const kigakuMonth = calendar.getKigakuMonth(dateStr);
  const yearBan = calendar.getYearBan(kigakuYear);
  const monthBan = calendar.getMonthBan(kigakuYear, kigakuMonth);
  const yearJunishi = calendar.getYearJunishi(kigakuYear);
  const monthJunishi = calendar.getMonthJunishi(kigakuYear, kigakuMonth);
  const yearDirections = judgeDirections(yearBan, honmeiStar, getsumeiStar, yearJunishi);
  const monthDirections = judgeDirections(monthBan, honmeiStar, getsumeiStar, monthJunishi);

  // バッチ生成済みの日次運勢テキスト
  const fortune = getDailyFortune(user.id, dateStr);

  return c.json({
    date: dateStr,
    honmeiStar,
    getsumeiStar,
    dayBan: {
      center: dayBan.center,
      positions: dayBan.positions,
    },
    directions: {
      day: directions,
      month: monthDirections,
      year: yearDirections,
    },
    fortune: fortune
      ? {
          text: fortune.fortune_text,
          directionsJson: fortune.directions_json
            ? (JSON.parse(fortune.directions_json) as unknown)
            : null,
        }
      : null,
  });
});

export default today;
