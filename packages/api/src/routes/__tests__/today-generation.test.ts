/**
 * GET /api/today の初回アクセス生成(遅延キャッシュ)。
 *   - キャッシュミス(未生成): その場で生成して sections を返し、DB に保存する。
 *   - キャッシュヒット(生成済み): 既存の sections をそのまま返す(再生成しない)。
 *
 * env は mock プロバイダに固定(実 API を叩かない)。
 */

import { beforeEach, describe, expect, it } from "vitest";

process.env.NODE_ENV = "development";
process.env.DATABASE_PATH = ":memory:";
process.env.LLM_PROVIDER = "mock";

import app from "../../app.js";
import { initMemoryDb } from "../../db/connection.js";
import { createProfile, createUser, getDailyFortune, saveDailyFortune } from "../../db/queries.js";
import { initDb } from "../../db/schema.js";

const LINE_ID = "U-today";

function seedUser(): number {
  const u = createUser(LINE_ID, null, true);
  createProfile(u.id, {
    birthDate: "1990-05-17",
    nameKana: "テスト",
    nameRomaji: "TEST",
    charStyle: "male",
  });
  return u.id;
}

function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function getToday(): Response | Promise<Response> {
  return app.fetch(
    new Request("http://localhost/api/today", {
      headers: { Authorization: `Bearer dev:${LINE_ID}` },
    }),
  );
}

interface TodayResponse {
  readonly directions: { day: unknown[] };
  readonly fortune: {
    text: string | null;
    sections: { fortune: string; schedule: string; characterNote: string } | null;
  } | null;
}

describe("GET /api/today 遅延生成", () => {
  beforeEach(() => {
    const db = initMemoryDb();
    initDb(db);
  });

  it("キャッシュミス: 初回アクセスで生成し、sections を返して DB に保存する", async () => {
    const userId = seedUser();
    expect(getDailyFortune(userId, todayJST())).toBeUndefined();

    const res = await getToday();
    expect(res.status).toBe(200);
    const body = (await res.json()) as TodayResponse;

    // 決定的な方位計算は必ず返る
    expect(Array.isArray(body.directions.day)).toBe(true);
    // 3セクションが生成されている
    expect(body.fortune?.sections?.fortune.length).toBeGreaterThan(0);
    expect(body.fortune?.sections?.characterNote.length).toBeGreaterThan(0);

    // DB にキャッシュされている
    const saved = getDailyFortune(userId, todayJST());
    expect(saved?.sections_json).toBeTruthy();
  });

  it("キャッシュヒット: 既存の sections をそのまま返す(再生成しない)", async () => {
    const userId = seedUser();
    // 事前に判別可能な sections を保存しておく
    const marker = {
      fortune: "既存キャッシュの運勢",
      schedule: "既存キャッシュのスケジュール",
      characterNote: "既存キャッシュの一言",
    };
    saveDailyFortune(
      userId,
      todayJST(),
      JSON.stringify({ date: todayJST() }),
      marker.fortune,
      JSON.stringify(marker),
    );

    const res = await getToday();
    expect(res.status).toBe(200);
    const body = (await res.json()) as TodayResponse;
    // 生成で上書きされず、保存済みの値が返る(mock の「【モック運勢】…」ではない)
    expect(body.fortune?.sections?.fortune).toBe(marker.fortune);
    expect(body.fortune?.sections?.characterNote).toBe(marker.characterNote);
  });
});
