/**
 * 方位 → ベアリング(方位角)、2点間の方位角・方位判定、指定距離オフセットした地点の算出。
 *
 * CLAUDE.md ルール1: 方位は engine の方位定義(N/NE/E…)を正とし、
 * その中心方位角を使う(真北基準・確定済み仕様)。天文計算は行わず単純な球面移動のみ。
 *
 * ★方位の角度範囲は docs/02 §方位の角度範囲(確定事項 #5)が一次情報:
 *   四正(N/E/S/W)= 各30度、四隅(NE/SE/SW/NW)= 各60度。45度均等ではない。
 *   engine の DEFAULT_CONFIG.useTraditionalAngles = true(30/60度方式)と一致する。
 */

import type { Direction8 } from "@mj/engine";

/** 緯度経度(度) */
export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * 8方位の中心ベアリング(真北=0°、時計回り)。
 * engine の Direction8 に対応。北基準は確定済み仕様(真北)。
 */
const DIRECTION_BEARING: Readonly<Record<Direction8, number>> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

/** 方位 → 中心ベアリング(度) */
export function bearingOf(direction: Direction8): number {
  return DIRECTION_BEARING[direction];
}

/** 方位の角度範囲(度)。start を含み end を含まない(時計回り)。N のみ 0° をまたぐ */
export interface DirectionSector {
  readonly start: number;
  readonly end: number;
}

/**
 * 8方位の角度範囲(30/60度方式・真北基準)。docs/02 §方位の角度範囲 が一次情報。
 * 独自に角度を決めてはならない(liff の SECTOR_ANGLES と同一値)。
 */
const DIRECTION_SECTORS: Readonly<Record<Direction8, DirectionSector>> = {
  N: { start: 345, end: 15 },
  NE: { start: 15, end: 75 },
  E: { start: 75, end: 105 },
  SE: { start: 105, end: 165 },
  S: { start: 165, end: 195 },
  SW: { start: 195, end: 255 },
  W: { start: 255, end: 285 },
  NW: { start: 285, end: 345 },
};

/** 方位 → 角度範囲(度) */
export function sectorOf(direction: Direction8): DirectionSector {
  return DIRECTION_SECTORS[direction];
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** 角度を 0 以上 360 未満に正規化する */
export function normalizeBearing(deg: number): number {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
}

/**
 * 2点間の方位角(前方大円方位角)を返す。真北=0°、時計回り、0 以上 360 未満。
 *
 * 経度差は sin/cos を通すため、日付変更線(±180°)をまたぐ場合も正しく求まる。
 * 同一地点(方位が定義できない)の場合は 0 を返す(呼び出し側で「方位なし」扱いにする)。
 */
export function bearingBetween(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  if (y === 0 && x === 0) {
    return 0;
  }
  return normalizeBearing(toDeg(Math.atan2(y, x)));
}

/**
 * 方位角(度)が属する8方位を返す(30/60度方式・真北基準)。
 * 決定的ロジック(CLAUDE.md ルール1)。LLM には判定結果のみを渡す。
 */
export function directionOfBearing(bearingDeg: number): Direction8 {
  const b = normalizeBearing(bearingDeg);
  for (const [dir, sector] of Object.entries(DIRECTION_SECTORS) as [
    Direction8,
    DirectionSector,
  ][]) {
    // N は 345°→15° で 0° をまたぐため、start > end のときは OR 判定にする
    const inSector =
      sector.start > sector.end
        ? b >= sector.start || b < sector.end
        : b >= sector.start && b < sector.end;
    if (inSector) {
      return dir;
    }
  }
  // DIRECTION_SECTORS は 0〜360 を隙間なく覆うため到達しない(型の網羅性のための保険)
  return "N";
}

/**
 * 起点(自宅)から見た対象地点の8方位を返す。真北基準・30/60度方式。
 * 起点と対象が同一地点の場合は undefined(方位を定義できない)。
 */
export function directionBetween(from: LatLng, to: LatLng): Direction8 | undefined {
  if (from.lat === to.lat && from.lng === to.lng) {
    return undefined;
  }
  return directionOfBearing(bearingBetween(from, to));
}

/**
 * 起点から指定ベアリング(度)へ distanceKm だけ進んだ地点を返す(大円移動)。
 * 数km 程度のオフセットに十分な精度。
 */
export function offsetPoint(origin: LatLng, bearingDeg: number, distanceKm: number): LatLng {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}
