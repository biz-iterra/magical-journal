/**
 * リクエストボディの共通検証。
 *
 * ★検証をルートごとに書くと必ずずれる。実際、よく行く場所の座標だけ型・範囲を
 *   検証していて、登録・プロフィール更新は無検証だった(文字列の緯度がそのまま
 *   保存され、方位計算が NaN になる)。判定はここに集約する。
 */

import { isValidIsoDate, isValidTimeOfDay } from "@mj/engine";
import type { Context } from "hono";
import { type ApiErrorCode, fail } from "../errors.js";

/** 有効な緯度・経度か(数値・有限・範囲内) */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * 緯度・経度が「未指定」または「有効な組」であることを確かめる。
 * 片方だけ指定されている状態も不正として扱う(座標として使えないため)。
 */
export function isAbsentOrValidLatLng(lat: unknown, lng: unknown): boolean {
  const latAbsent = lat === undefined || lat === null;
  const lngAbsent = lng === undefined || lng === null;
  if (latAbsent && lngAbsent) return true;
  if (latAbsent !== lngAbsent) return false;
  return isValidLatLng(lat, lng);
}

/** 実在する生年月日か(書式だけでなく暦上の実在も見る) */
export function isValidBirthDate(value: unknown): value is string {
  return typeof value === "string" && isValidIsoDate(value);
}

/** 実在する時刻("HH:MM")か */
export function isValidBirthTime(value: unknown): value is string {
  return typeof value === "string" && isValidTimeOfDay(value);
}

/** かな(ひらがな・カタカナ)と区切り文字だけで構成されているか */
const KANA_ONLY = /^[ぁ-ゖァ-ヺー　\s\-ー]+$/;

export function isKanaName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && KANA_ONLY.test(value);
}

/**
 * DB に保存された JSON を読む。壊れていたら null を返す。
 * 決定的に算出できる値まで巻き添えで 500 にしないためのガード。
 */
export function parseJsonOrNull(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * SQLite の UNIQUE 制約違反か。
 * 存在チェックと INSERT の間に await が挟まると並行リクエストが両方通過しうるため、
 * 「制約に当たった＝すでに登録済み」として 409 に落とすのに使う。
 */
export function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && code.startsWith("SQLITE_CONSTRAINT");
}

/**
 * JSON ボディを読む。壊れた JSON は 500 ではなく 400 で返す。
 * 成功なら { ok: true, body }、失敗なら { ok: false, response } を返す。
 */
export async function readJsonBody<T>(
  c: Context,
  code: ApiErrorCode = "MJ-REQ-001",
): Promise<{ ok: true; body: T } | { ok: false; response: ReturnType<typeof fail> }> {
  try {
    return { ok: true, body: await c.req.json<T>() };
  } catch {
    return { ok: false, response: fail(c, code) };
  }
}
