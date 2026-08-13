/**
 * GET /api/profile  → プロフィール + 診断結果を返す
 * PATCH /api/profile → プロフィール更新
 *
 * 本人セッション必須(auth ミドルウェアで担保)。
 */

import type { ProfileInputs } from "@mj/engine";
import { Hono } from "hono";
import { getDb } from "../db/connection.js";
import { getDiagResults, getProfile, getUserByLineId, updateProfile } from "../db/queries.js";
import { fail } from "../errors.js";
import { isAbsentOrValidLatLng, isValidBirthTime, readJsonBody } from "../lib/validate.js";
import { runAndSaveDiagnosis } from "../services/diagnosis.js";
import type { AppEnv, ProfileUpdateBody } from "../types.js";

const profile = new Hono<AppEnv>();

profile.get("/", (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const prof = getProfile(user.id);
  if (!prof) {
    return fail(c, "MJ-PROFILE-404");
  }

  const diagResults = getDiagResults(user.id);

  // 診断結果の JSON を展開して返す
  const diagnosis = diagResults.map((r) => ({
    moduleId: r.module_id,
    moduleVersion: r.module_version,
    result: JSON.parse(r.result_json) as unknown,
    computedAt: r.computed_at,
  }));

  return c.json({
    profile: {
      birthDate: prof.birth_date,
      birthTime: prof.birth_time,
      nameKana: prof.name_kana,
      nameRomaji: prof.name_romaji,
      addressText: prof.address_text,
      lat: prof.lat,
      lng: prof.lng,
      charStyle: prof.char_style,
    },
    diagnosis,
  });
});

profile.patch("/", async (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const parsed = await readJsonBody<ProfileUpdateBody>(c);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  if (body.charStyle !== undefined && body.charStyle !== "male" && body.charStyle !== "female") {
    return fail(c, "MJ-PROF-001");
  }

  if (body.birthTime != null && !isValidBirthTime(body.birthTime)) {
    return fail(c, "MJ-PROF-002");
  }

  // 座標。無検証だと文字列や範囲外がそのまま保存され、方位・場所提案が壊れる
  if (!isAbsentOrValidLatLng(body.lat, body.lng)) {
    return fail(c, "MJ-PROF-003");
  }

  // 出生時刻はポテンシャルタイプ(ハイブリッド判定)に影響するため、
  // 変更時は診断を再計算する。プロフィール更新と再診断を1トランザクションで行う。
  const db = getDb();
  const updated = db.transaction(() => {
    const u = updateProfile(user.id, {
      birthTime: body.birthTime,
      addressText: body.addressText,
      lat: body.lat,
      lng: body.lng,
      charStyle: body.charStyle,
    });
    if (!u) return undefined;

    if (body.birthTime !== undefined) {
      const inputs: ProfileInputs = {
        birthDate: u.birth_date,
        birthTime: u.birth_time ?? undefined,
        nameKana: u.name_kana ?? undefined,
        nameRomaji: u.name_romaji ?? undefined,
        homeLat: u.lat ?? undefined,
        homeLng: u.lng ?? undefined,
      };
      runAndSaveDiagnosis(user.id, inputs);
    }

    return u;
  })();

  if (!updated) {
    return fail(c, "MJ-PROFILE-404");
  }

  return c.json({
    profile: {
      birthDate: updated.birth_date,
      birthTime: updated.birth_time,
      nameKana: updated.name_kana,
      nameRomaji: updated.name_romaji,
      addressText: updated.address_text,
      lat: updated.lat,
      lng: updated.lng,
      charStyle: updated.char_style,
    },
  });
});

export default profile;
