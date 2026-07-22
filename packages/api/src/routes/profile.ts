/**
 * GET /api/profile  → プロフィール + 診断結果を返す
 * PATCH /api/profile → プロフィール更新
 *
 * 本人セッション必須(auth ミドルウェアで担保)。
 */

import { Hono } from "hono";
import { getDiagResults, getProfile, getUserByLineId, updateProfile } from "../db/queries.js";
import type { AppEnv, ProfileUpdateBody } from "../types.js";

const profile = new Hono<AppEnv>();

profile.get("/", (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const prof = getProfile(user.id);
  if (!prof) {
    return c.json({ error: "Profile not found" }, 404);
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
    return c.json({ error: "User not found" }, 404);
  }

  const body = await c.req.json<ProfileUpdateBody>();

  if (body.charStyle !== undefined && body.charStyle !== "male" && body.charStyle !== "female") {
    return c.json({ error: "charStyle must be 'male' or 'female'" }, 400);
  }

  const updated = updateProfile(user.id, {
    addressText: body.addressText,
    lat: body.lat,
    lng: body.lng,
    charStyle: body.charStyle,
  });

  if (!updated) {
    return c.json({ error: "Profile not found" }, 404);
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
