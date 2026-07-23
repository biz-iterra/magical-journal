/**
 * GET /api/monthly
 *
 * 今月(気学月)の月盤 + 月方位判定 + monthly_fortunes を返す。
 * 方位判定は engine を直接呼ぶ(保存済みバッチ結果ではなくリアルタイム計算)。
 * 月運テキストは月次バッチが事前生成したものを返す(未生成なら fortune=null)。
 *
 * キーは「気学の年・月」(節入り基準)。カレンダー月とは境界がずれるため、
 * 実行時に節入り基準の気学年・気学月を求めてから monthly_fortunes を引く。
 */

import { MasterCalendarProvider } from "@mj/calendar-data";
import { computeGetsumeiStar, computeHonmeiStar, judgeDirections } from "@mj/engine";
import { Hono } from "hono";
import { getMonthlyFortune, getProfile, getUserByLineId } from "../db/queries.js";
import { fail } from "../errors.js";
import type { AppEnv } from "../types.js";

const monthly = new Hono<AppEnv>();

/**
 * JST で今日の日付を "YYYY-MM-DD" 形式で返す。
 * Date オブジェクトのタイムゾーン依存を避けるため Intl を使用。
 */
function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

monthly.get("/", (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const prof = getProfile(user.id);
  if (!prof) {
    return fail(c, "MJ-PROFILE-404");
  }

  const dateStr = todayJST();
  const calendar = new MasterCalendarProvider();

  // 本命星・月命星の算出
  const honmeiStar = computeHonmeiStar(prof.birth_date, calendar);
  const getsumeiStar = computeGetsumeiStar(honmeiStar, prof.birth_date, calendar);

  // 現在の気学年・気学月(節入り基準)を求める
  const kigakuYear = calendar.getKigakuYear(dateStr);
  const kigakuMonth = calendar.getKigakuMonth(dateStr);

  // 月盤の取得と月方位判定
  const monthBan = calendar.getMonthBan(kigakuYear, kigakuMonth);
  const monthJunishi = calendar.getMonthJunishi(kigakuYear, kigakuMonth);
  const monthDirections = judgeDirections(monthBan, honmeiStar, getsumeiStar, monthJunishi);

  // 月次バッチ生成済みの月運テキスト(節入り基準キーで取得)
  const fortune = getMonthlyFortune(user.id, kigakuYear, kigakuMonth);

  return c.json({
    date: dateStr,
    kigakuYear,
    kigakuMonth,
    honmeiStar,
    getsumeiStar,
    homeLatLng:
      prof.lat != null && prof.lng != null
        ? { lat: prof.lat as number, lng: prof.lng as number }
        : null,
    monthBan: {
      center: monthBan.center,
      positions: monthBan.positions,
    },
    directions: {
      month: monthDirections,
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

export default monthly;
