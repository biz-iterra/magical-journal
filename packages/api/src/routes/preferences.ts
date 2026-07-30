/**
 * 「今日のジャーナルを自分好みにする設定」の取得・更新。
 *
 *   GET    /api/preferences              → 設定 + よく行く場所の一覧
 *   PATCH  /api/preferences              → 設定の部分更新(null で未設定へ戻す)
 *   POST   /api/preferences/places       → よく行く場所を1件追加
 *   DELETE /api/preferences/places/:id   → よく行く場所を1件削除
 *
 * 設計判断: /api/profile とは別ルートにする。profile は「診断の入力」(birthTime 変更で
 * 再診断が走る)を担うが、ここで扱うのは診断に一切影響しない生成の嗜好であり、
 * さらによく行く場所は複数行のサブリソース(追加・削除)なので単一オブジェクトの
 * PATCH には収まらない。
 *
 * 本人セッション必須(auth ミドルウェアで担保)。第三者情報は扱わない(本人の行き先のみ)。
 * 座標はフロントが Geocoding で取得して送る(サーバーでは Geocoding しない)。
 * 個人情報(住所・座標)はログに出力しない。
 */

import {
  DEFAULT_HOLIDAY_WEEKDAYS,
  FAVORITE_PLACES_LIMIT,
  isHolidayWeekdays,
  isTimeOfDay,
  isTransportMode,
} from "@mj/batch";
import { Hono } from "hono";
import {
  countFavoritePlaces,
  createFavoritePlace,
  deleteFavoritePlace,
  getFavoritePlaces,
  getUserByLineId,
  getUserPreferences,
  upsertUserPreferences,
} from "../db/queries.js";
import { fail } from "../errors.js";
import { parseHolidayWeekdays } from "../services/preferences.js";
import type {
  AppEnv,
  FavoritePlaceCreateBody,
  FavoritePlaceRow,
  PreferencesUpdateBody,
  UserPreferencesRow,
} from "../types.js";

const preferences = new Hono<AppEnv>();

/** 名前・カテゴリ・住所の最大文字数(異常に長い入力を弾く) */
const MAX_NAME_LENGTH = 60;
const MAX_CATEGORY_LENGTH = 30;
const MAX_ADDRESS_LENGTH = 200;

/** 応答の設定オブジェクト(未設定は null)。holidayWeekdays 未設定時は既定値も併せて返す */
interface PreferencesResponse {
  readonly wakeTime: string | null;
  readonly sleepTime: string | null;
  readonly transportMode: string | null;
  /** ユーザーが明示設定した曜日。未設定なら null */
  readonly holidayWeekdays: readonly number[] | null;
  /** 実際に適用される休日曜日(未設定なら既定の土日)。UI の表示に使う */
  readonly effectiveHolidayWeekdays: readonly number[];
}

function toPreferencesResponse(row: UserPreferencesRow | undefined): PreferencesResponse {
  const holidayWeekdays = row ? parseHolidayWeekdays(row.holiday_weekdays) : null;
  return {
    wakeTime: row?.wake_time ?? null,
    sleepTime: row?.sleep_time ?? null,
    transportMode: row?.transport_mode ?? null,
    holidayWeekdays,
    effectiveHolidayWeekdays: holidayWeekdays ?? DEFAULT_HOLIDAY_WEEKDAYS,
  };
}

function toPlaceResponse(row: FavoritePlaceRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    addressText: row.address_text,
    lat: row.lat,
    lng: row.lng,
  };
}

/** "HH:MM" / null(未設定へ戻す)/ undefined(変更しない)以外を弾く */
function isValidTimeField(value: unknown): boolean {
  return value === undefined || value === null || isTimeOfDay(value);
}

preferences.get("/", (c) => {
  const user = getUserByLineId(c.get("lineUserId"));
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  return c.json({
    preferences: toPreferencesResponse(getUserPreferences(user.id)),
    places: getFavoritePlaces(user.id).map(toPlaceResponse),
    limits: { places: FAVORITE_PLACES_LIMIT },
  });
});

preferences.patch("/", async (c) => {
  const user = getUserByLineId(c.get("lineUserId"));
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const body = await c.req.json<PreferencesUpdateBody>();

  if (!isValidTimeField(body.wakeTime) || !isValidTimeField(body.sleepTime)) {
    return fail(c, "MJ-PREF-001");
  }

  if (
    body.transportMode !== undefined &&
    body.transportMode !== null &&
    !isTransportMode(body.transportMode)
  ) {
    return fail(c, "MJ-PREF-002");
  }

  if (
    body.holidayWeekdays !== undefined &&
    body.holidayWeekdays !== null &&
    !isHolidayWeekdays(body.holidayWeekdays)
  ) {
    return fail(c, "MJ-PREF-003");
  }

  const row = upsertUserPreferences(user.id, {
    wakeTime: body.wakeTime,
    sleepTime: body.sleepTime,
    transportMode: body.transportMode,
    holidayWeekdaysJson:
      body.holidayWeekdays === undefined
        ? undefined
        : body.holidayWeekdays === null
          ? null
          : JSON.stringify(body.holidayWeekdays),
  });

  return c.json({ preferences: toPreferencesResponse(row) });
});

preferences.post("/places", async (c) => {
  const user = getUserByLineId(c.get("lineUserId"));
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const body = await c.req.json<FavoritePlaceCreateBody>();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const addressText = typeof body.addressText === "string" ? body.addressText.trim() : "";
  if (
    name.length === 0 ||
    name.length > MAX_NAME_LENGTH ||
    addressText.length === 0 ||
    addressText.length > MAX_ADDRESS_LENGTH
  ) {
    return fail(c, "MJ-PREF-004");
  }

  // 座標の妥当性(フロントの Geocoding 結果。サーバーでは Geocoding しない)
  if (
    typeof body.lat !== "number" ||
    typeof body.lng !== "number" ||
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lng) ||
    body.lat < -90 ||
    body.lat > 90 ||
    body.lng < -180 ||
    body.lng > 180
  ) {
    return fail(c, "MJ-PREF-005");
  }

  const rawCategory = typeof body.category === "string" ? body.category.trim() : "";
  if (rawCategory.length > MAX_CATEGORY_LENGTH) {
    return fail(c, "MJ-PREF-004");
  }

  // 件数上限(サーバー側でも持つ)
  if (countFavoritePlaces(user.id) >= FAVORITE_PLACES_LIMIT) {
    return fail(c, "MJ-PREF-409");
  }

  const row = createFavoritePlace(user.id, {
    name,
    category: rawCategory.length > 0 ? rawCategory : null,
    addressText,
    lat: body.lat,
    lng: body.lng,
  });

  return c.json({ place: toPlaceResponse(row) }, 201);
});

preferences.delete("/places/:id", (c) => {
  const user = getUserByLineId(c.get("lineUserId"));
  if (!user) {
    return fail(c, "MJ-USER-404");
  }

  const placeId = Number(c.req.param("id"));
  if (!Number.isInteger(placeId) || placeId < 1) {
    return fail(c, "MJ-PREF-404");
  }

  // user_id 条件付きで削除(他人の行は消せない)
  if (!deleteFavoritePlace(user.id, placeId)) {
    return fail(c, "MJ-PREF-404");
  }

  return c.json({ deleted: placeId });
});

export default preferences;
