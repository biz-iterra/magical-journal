/**
 * 生成プロバイダの構築失敗(LLM キー未設定など)に対するグレースフル動作。
 *
 * LLM_PROVIDER=claude かつ ANTHROPIC_API_KEY 未設定 → createLlmProvider が throw する。
 * このとき:
 *   - POST /api/register は 201 を返す(fire-and-forget の生成失敗は登録に影響しない)。
 *   - GET /api/today は 200 を返し、決定的な方位は返しつつ fortune=null で続行する。
 *
 * env は claude(キー無し)に固定する。実 API へは到達しない(構築時点で throw)。
 */

import { beforeEach, describe, expect, it } from "vitest";

process.env.NODE_ENV = "development";
process.env.DATABASE_PATH = ":memory:";
process.env.LLM_PROVIDER = "claude";
process.env.ANTHROPIC_API_KEY = "";

import app from "../../app.js";
import { initMemoryDb } from "../../db/connection.js";
import { createProfile, createUser, getPersonalityReport } from "../../db/queries.js";
import { initDb } from "../../db/schema.js";

function seedUser(lineId: string): number {
  const u = createUser(lineId, null, true);
  createProfile(u.id, {
    birthDate: "1990-05-17",
    nameKana: "テスト",
    nameRomaji: "TEST",
    charStyle: "male",
  });
  return u.id;
}

describe("生成失敗時のグレースフル動作", () => {
  beforeEach(() => {
    const db = initMemoryDb();
    initDb(db);
  });

  it("POST /api/register: 性質生成が失敗しても登録は 201 で成功する", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          Authorization: "Bearer dev:U-reg-fail",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          birthDate: "1990-05-17",
          nameKana: "テスト",
          nameRomaji: "TEST",
          charStyle: "male",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { userId: number };
    expect(body.userId).toBeGreaterThan(0);
    // fire-and-forget の生成は失敗したので未生成のまま(登録自体は成立)
    expect(getPersonalityReport(body.userId)).toBeUndefined();
  });

  it("GET /api/today: 文章生成に失敗しても 200 + 方位を返し fortune=null で続行する", async () => {
    seedUser("U-today-fail");
    const res = await app.fetch(
      new Request("http://localhost/api/today", {
        headers: { Authorization: "Bearer dev:U-today-fail" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      directions: { day: unknown[] };
      fortune: unknown | null;
    };
    // 決定的な方位計算は返る
    expect(Array.isArray(body.directions.day)).toBe(true);
    // 文章は生成できないので null(500 にしない)
    expect(body.fortune).toBeNull();
  });
});
