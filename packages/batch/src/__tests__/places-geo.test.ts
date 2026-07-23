import { describe, expect, it } from "vitest";
import { bearingOf, offsetPoint } from "../places/geo.js";

describe("bearingOf", () => {
  it("8方位の中心ベアリング(真北=0°・時計回り)", () => {
    expect(bearingOf("N")).toBe(0);
    expect(bearingOf("NE")).toBe(45);
    expect(bearingOf("E")).toBe(90);
    expect(bearingOf("SE")).toBe(135);
    expect(bearingOf("S")).toBe(180);
    expect(bearingOf("SW")).toBe(225);
    expect(bearingOf("W")).toBe(270);
    expect(bearingOf("NW")).toBe(315);
  });
});

describe("offsetPoint", () => {
  const origin = { lat: 35.6812, lng: 139.7671 }; // 東京駅付近

  it("北(0°)へ進むと緯度が上がり経度はほぼ不変", () => {
    const p = offsetPoint(origin, 0, 3);
    expect(p.lat).toBeGreaterThan(origin.lat);
    expect(Math.abs(p.lng - origin.lng)).toBeLessThan(0.001);
  });

  it("東(90°)へ進むと経度が上がり緯度はほぼ不変", () => {
    const p = offsetPoint(origin, 90, 3);
    expect(p.lng).toBeGreaterThan(origin.lng);
    expect(Math.abs(p.lat - origin.lat)).toBeLessThan(0.001);
  });

  it("3km 移動距離が概ね正しい(緯度1度≒111km)", () => {
    const p = offsetPoint(origin, 0, 111);
    // 北へ111km ≒ 緯度+1度
    expect(p.lat - origin.lat).toBeCloseTo(1, 1);
  });
});
