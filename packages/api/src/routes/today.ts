/**
 * GET /api/today
 *
 * 今日の日盤 + 方位判定 + daily_fortunes を返す。
 * 方位判定は engine を直接呼ぶ(保存済みのバッチ結果ではなくリアルタイム計算)。
 *
 * 文章(3セクション)は未生成なら初回アクセス時に同期生成してキャッシュする
 * (CLAUDE.md ルール6: リクエストトリガー生成 + 保険の夜間バッチ)。バッチが先に
 * 生成済みならキャッシュヒットで LLM を呼ばない。生成失敗は握りつぶさずログに残し、
 * 決定的な方位計算は必ず返して fortune=null(または既存行)で続行する。
 */

import { generateDailyForUser } from "@mj/batch";
import { MasterCalendarProvider } from "@mj/calendar-data";
import { computeGetsumeiStar, computeHonmeiStar, judgeDirections } from "@mj/engine";
import { Hono } from "hono";
import { getDailyFortune, getProfile, getUserByLineId, saveDailyFortune } from "../db/queries.js";
import { fail } from "../errors.js";
import { buildGenerationProviders } from "../services/generation.js";
import type { AppEnv } from "../types.js";

const today = new Hono<AppEnv>();

/**
 * JST で今日の日付を "YYYY-MM-DD" 形式で返す。
 * Date オブジェクトのタイムゾーン依存を避けるため Intl を使用。
 */
function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

today.get("/", async (c) => {
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

  // 日次運勢テキスト(3セクション)。未生成なら初回アクセス時に同期生成してキャッシュする。
  // バッチが先に生成済みならこのキャッシュヒットで LLM を呼ばない。
  let fortune = getDailyFortune(user.id, dateStr);
  if (!fortune || !fortune.sections_json) {
    try {
      const { config, provider, places } = buildGenerationProviders();
      const activeUser = {
        userId: user.id,
        birthDate: prof.birth_date,
        birthTime: prof.birth_time,
        charStyle: prof.char_style,
        lat: prof.lat,
        lng: prof.lng,
      };
      const gen = await generateDailyForUser(activeUser, dateStr, {
        provider,
        calendar,
        places,
        placesOffsetKm: config.placesOffsetKm,
        placesRadiusMeters: config.placesRadiusMeters,
      });
      // upsert(ON CONFLICT で安全に上書き。同時アクセスの二重生成は低トラフィックで許容)
      saveDailyFortune(
        user.id,
        dateStr,
        JSON.stringify(gen.structured),
        gen.sections.fortune || null,
        JSON.stringify(gen.sections),
      );
      fortune = getDailyFortune(user.id, dateStr);
    } catch (err) {
      // 握りつぶさずログに残す。個人情報は出さない(user_id のみ)。
      // 決定的な方位計算は返せるので fortune=null(or 既存行)で続行し、500 にしない。
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[today] user_id=${String(user.id)} 文章生成に失敗(方位のみ返す): ${message}`);
    }
  }

  // 3セクション {fortune, schedule, characterNote}(バッチが sections_json に保存)。
  // 旧行(sections_json 未生成)や壊れた JSON の場合は fortune_text を運勢へフォールバック。
  let sections: { fortune: string; schedule: string; characterNote: string } | null = null;
  if (fortune?.sections_json) {
    try {
      const parsed = JSON.parse(fortune.sections_json) as Partial<{
        fortune: string;
        schedule: string;
        characterNote: string;
      }>;
      sections = {
        fortune: parsed.fortune ?? fortune.fortune_text ?? "",
        schedule: parsed.schedule ?? "",
        characterNote: parsed.characterNote ?? "",
      };
    } catch {
      sections = null;
    }
  }

  return c.json({
    date: dateStr,
    honmeiStar,
    getsumeiStar,
    homeLatLng:
      prof.lat != null && prof.lng != null
        ? { lat: prof.lat as number, lng: prof.lng as number }
        : null,
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
          // 後方互換: 従来の単一テキスト(= 運勢セクション相当)
          text: fortune.fortune_text,
          // 新: 3セクション。未生成/パース不能なら null
          sections,
          directionsJson: fortune.directions_json
            ? (JSON.parse(fortune.directions_json) as unknown)
            : null,
        }
      : null,
  });
});

export default today;
