/**
 * 方位 → ベアリング(方位角)と、指定距離オフセットした地点の算出。
 *
 * CLAUDE.md ルール1: 方位は engine の方位定義(N/NE/E…)を正とし、
 * その中心方位角を使う(真北基準・確定済み仕様)。天文計算は行わず単純な球面移動のみ。
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

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

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
