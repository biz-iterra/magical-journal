/**
 * GET /api/diagnosis
 *
 * 診断結果をモジュール別に返す。
 * 本人セッション必須。
 */

import { Hono } from "hono";
import { getDiagResults, getUserByLineId } from "../db/queries.js";
import type { AppEnv } from "../types.js";

const diagnosis = new Hono<AppEnv>();

diagnosis.get("/", (c) => {
  const lineUserId = c.get("lineUserId");

  const user = getUserByLineId(lineUserId);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const results = getDiagResults(user.id);

  const modules = results.map((r) => ({
    moduleId: r.module_id,
    moduleVersion: r.module_version,
    result: JSON.parse(r.result_json) as unknown,
    computedAt: r.computed_at,
  }));

  return c.json({ modules });
});

export default diagnosis;
