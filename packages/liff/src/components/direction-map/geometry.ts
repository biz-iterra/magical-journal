import type { Direction8, DirectionFortune } from "@mj/engine";

export interface SectorAngle {
  readonly start: number;
  readonly end: number;
}

const SECTOR_ANGLES: Record<Direction8, SectorAngle> = {
  N: { start: 345, end: 15 },
  NE: { start: 15, end: 75 },
  E: { start: 75, end: 105 },
  SE: { start: 105, end: 165 },
  S: { start: 165, end: 195 },
  SW: { start: 195, end: 255 },
  W: { start: 255, end: 285 },
  NW: { start: 285, end: 345 },
};

export function getSectorAngle(direction: Direction8): SectorAngle {
  return SECTOR_ANGLES[direction];
}

export function getFortuneColor(fortune: DirectionFortune): { color: string; opacity: number } {
  switch (fortune) {
    case "great_fortune":
      return { color: "#22c55e", opacity: 0.35 };
    case "fortune":
      return { color: "#4ade80", opacity: 0.25 };
    case "misfortune":
      return { color: "#ef4444", opacity: 0.3 };
    default:
      return { color: "#9ca3af", opacity: 0.08 };
  }
}

export const DISTANCE_RINGS_KM = [10, 50, 100] as const;

export function computeDestination(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number,
): { lat: number; lng: number } {
  const R = 6371;
  const d = distanceKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

export function generateArcPoints(
  center: { lat: number; lng: number },
  startDeg: number,
  endDeg: number,
  radiusKm: number,
  steps: number = 24,
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];

  let sweep = endDeg - startDeg;
  if (sweep <= 0) sweep += 360;

  for (let i = 0; i <= steps; i++) {
    const angle = startDeg + (sweep * i) / steps;
    points.push(computeDestination(center.lat, center.lng, angle, radiusKm));
  }

  return points;
}
