/**
 * POST /api/personality/regenerate のレート制限(1ユーザー1日5回)と、
 * カウントの当日/翌日境界のテスト。
 *
 * env は本ファイル冒頭で mock プロバイダに固定する(実 API を叩かない)。
 * getEnv()/getConfig() は遅延評価なので、リクエスト時までに設定されていればよい。
 */

import { beforeEach, describe, expect, it } from "vitest";

process.env.NODE_ENV = "development";
process.env.DATABASE_PATH = ":memory:";
process.env.LLM_PROVIDER = "mock";

import app from "../../app.js";
import { initMemoryDb } from "../../db/connection.js";
import { createProfile, createUser, getRegenCount, incrementRegenCount } from "../../db/queries.js";
import { initDb } from "../../db/schema.js";

const LINE_ID = "U-regen";

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

function regenerate(): Response | Promise<Response> {
  return app.fetch(
    new Request("http://localhost/api/personality/regenerate", {
      method: "POST",
      headers: { Authorization: `Bearer dev:${LINE_ID}` },
    }),
  );
}

describe("POST /api/personality/regenerate レート制限", () => {
  beforeEach(() => {
    const db = initMemoryDb();
    initDb(db);
  });

  it("1日5回まで成功し、6回目は MJ-PERS-429 を返す", async () => {
    seedUser();

    // 1〜5回目(4回目・5回目も含めて)成功
    for (let i = 1; i <= 5; i += 1) {
      const res = await regenerate();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { report: { items: Record<string, string> } };
      expect(Object.keys(body.report.items)).toHaveLength(6);
    }

    // 6回目は生成せず 429
    const sixth = await regenerate();
    expect(sixth.status).toBe(429);
    const err = (await sixth.json()) as { code: string };
    expect(err.code).toBe("MJ-PERS-429");
  });

  it("試行時にカウントを消費する(5回試行で count=5)", async () => {
    const userId = seedUser();
    for (let i = 0; i < 5; i += 1) {
      await regenerate();
    }
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
    expect(getRegenCount(userId, dateStr)).toBe(5);
  });

  it("未登録ユーザーは MJ-USER-404(カウントを消費しない)", async () => {
    const res = await regenerate();
    expect(res.status).toBe(404);
    const err = (await res.json()) as { code: string };
    expect(err.code).toBe("MJ-USER-404");
  });
});

describe("incrementRegenCount / getRegenCount(当日=消費・翌日=リセット)", () => {
  beforeEach(() => {
    const db = initMemoryDb();
    initDb(db);
  });

  it("同一日は加算され、翌日は 0 から始まる(日付キーでリセット)", () => {
    const userId = seedUser();
    const today = "2026-07-24";
    const tomorrow = "2026-07-25";

    // 当日 4回目 OK / 5回目 OK まで加算(返り値が加算後の値)
    expect(incrementRegenCount(userId, today)).toBe(1);
    expect(incrementRegenCount(userId, today)).toBe(2);
    expect(incrementRegenCount(userId, today)).toBe(3);
    expect(incrementRegenCount(userId, today)).toBe(4);
    expect(incrementRegenCount(userId, today)).toBe(5);
    expect(getRegenCount(userId, today)).toBe(5);

    // 翌日は別キー → 0 から
    expect(getRegenCount(userId, tomorrow)).toBe(0);
    expect(incrementRegenCount(userId, tomorrow)).toBe(1);
    // 当日分は影響を受けない
    expect(getRegenCount(userId, today)).toBe(5);
  });
});
