/**
 * POST /api/register
 *
 * ユーザー登録:
 * 1. users + profiles を INSERT
 * 2. enabled モジュール全実行 → diag_results を保存
 * 3. 201 を返す
 */

import type { ProfileInputs } from "@mj/engine";
import { Hono } from "hono";
import { getDb } from "../db/connection.js";
import { createProfile, createUser, getUserByLineId } from "../db/queries.js";
import { fail } from "../errors.js";
import { runAndSaveDiagnosis } from "../services/diagnosis.js";
import type { AppEnv, RegisterBody } from "../types.js";

const register = new Hono<AppEnv>();

register.post("/", async (c) => {
  const lineUserId = c.get("lineUserId");

  // 既存ユーザーチェック
  const existing = getUserByLineId(lineUserId);
  if (existing) {
    return fail(c, "MJ-REG-409");
  }

  // リクエストボディの検証
  const body = await c.req.json<RegisterBody>();

  if (!body.birthDate || !body.nameKana || !body.nameRomaji || !body.charStyle) {
    return fail(c, "MJ-REG-001");
  }

  if (body.charStyle !== "male" && body.charStyle !== "female") {
    return fail(c, "MJ-REG-002");
  }

  // 日付形式の簡易チェック
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
    return fail(c, "MJ-REG-003");
  }

  // 出生時刻の簡易チェック
  if (body.birthTime !== undefined && !/^\d{2}:\d{2}$/.test(body.birthTime)) {
    return fail(c, "MJ-REG-004");
  }

  // トランザクションで一括処理
  const db = getDb();
  const transaction = db.transaction(() => {
    // 1. ユーザー作成
    const user = createUser(lineUserId, null, true);

    // 2. プロフィール作成
    createProfile(user.id, {
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      nameKana: body.nameKana,
      nameRomaji: body.nameRomaji,
      addressText: body.addressText,
      lat: body.lat,
      lng: body.lng,
      charStyle: body.charStyle,
    });

    // 3. 全 enabled モジュール実行 → diag_results 保存
    const inputs: ProfileInputs = {
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      nameKana: body.nameKana,
      nameRomaji: body.nameRomaji,
      homeLat: body.lat,
      homeLng: body.lng,
    };

    runAndSaveDiagnosis(user.id, inputs);

    return user;
  });

  const user = transaction();

  return c.json({ message: "Registration successful", userId: user.id }, 201);
});

export default register;
