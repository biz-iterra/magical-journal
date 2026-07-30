import type { Direction8 } from "@mj/engine";
import { describe, expect, it } from "vitest";
import {
  bearingBetween,
  bearingOf,
  directionBetween,
  directionOfBearing,
  normalizeBearing,
  offsetPoint,
  sectorOf,
} from "../places/geo.js";

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

describe("normalizeBearing", () => {
  it("0 以上 360 未満へ正規化する(負値・360超も)", () => {
    expect(normalizeBearing(0)).toBe(0);
    expect(normalizeBearing(360)).toBe(0);
    expect(normalizeBearing(365)).toBe(5);
    expect(normalizeBearing(-10)).toBe(350);
    expect(normalizeBearing(-370)).toBe(350);
  });
});

describe("sectorOf(30/60度方式・docs/02 §方位の角度範囲)", () => {
  it("四正は各30度・四隅は各60度(真北基準)", () => {
    expect(sectorOf("N")).toEqual({ start: 345, end: 15 });
    expect(sectorOf("NE")).toEqual({ start: 15, end: 75 });
    expect(sectorOf("E")).toEqual({ start: 75, end: 105 });
    expect(sectorOf("SE")).toEqual({ start: 105, end: 165 });
    expect(sectorOf("S")).toEqual({ start: 165, end: 195 });
    expect(sectorOf("SW")).toEqual({ start: 195, end: 255 });
    expect(sectorOf("W")).toEqual({ start: 255, end: 285 });
    expect(sectorOf("NW")).toEqual({ start: 285, end: 345 });
  });

  it("四正の合計は120度・四隅の合計は240度(=360度を隙間なく覆う)", () => {
    const width = (d: Direction8): number => {
      const s = sectorOf(d);
      return s.start > s.end ? 360 - s.start + s.end : s.end - s.start;
    };
    expect(width("N") + width("E") + width("S") + width("W")).toBe(120);
    expect(width("NE") + width("SE") + width("SW") + width("NW")).toBe(240);
  });
});

describe("directionOfBearing(8方位の境界値)", () => {
  it("各方位の中心ベアリングが自分自身の方位に入る", () => {
    const all: Direction8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    for (const d of all) {
      expect(directionOfBearing(bearingOf(d))).toBe(d);
    }
  });

  it("境界値: start は自分の方位に含まれ、直前は隣の方位になる", () => {
    // 北は 345〜15度(0度をまたぐ)
    expect(directionOfBearing(345)).toBe("N");
    expect(directionOfBearing(344.999)).toBe("NW");
    expect(directionOfBearing(0)).toBe("N");
    expect(directionOfBearing(359.999)).toBe("N");
    expect(directionOfBearing(14.999)).toBe("N");
    // 以降の境界
    expect(directionOfBearing(15)).toBe("NE");
    expect(directionOfBearing(74.999)).toBe("NE");
    expect(directionOfBearing(75)).toBe("E");
    expect(directionOfBearing(104.999)).toBe("E");
    expect(directionOfBearing(105)).toBe("SE");
    expect(directionOfBearing(164.999)).toBe("SE");
    expect(directionOfBearing(165)).toBe("S");
    expect(directionOfBearing(194.999)).toBe("S");
    expect(directionOfBearing(195)).toBe("SW");
    expect(directionOfBearing(254.999)).toBe("SW");
    expect(directionOfBearing(255)).toBe("W");
    expect(directionOfBearing(284.999)).toBe("W");
    expect(directionOfBearing(285)).toBe("NW");
  });

  it("360度超・負値でも正規化して判定する", () => {
    expect(directionOfBearing(360)).toBe("N");
    expect(directionOfBearing(450)).toBe("E"); // 450-360=90
    expect(directionOfBearing(-90)).toBe("W"); // -90+360=270
  });
});

describe("bearingBetween(2点から方位角。真北基準)", () => {
  const tokyo = { lat: 35.6812, lng: 139.7671 };

  it("真北・真南は 0°・180°", () => {
    expect(bearingBetween(tokyo, { lat: tokyo.lat + 1, lng: tokyo.lng })).toBeCloseTo(0, 6);
    expect(bearingBetween(tokyo, { lat: tokyo.lat - 1, lng: tokyo.lng })).toBeCloseTo(180, 6);
  });

  it("同緯度の東西はほぼ 90°・270°(大円のためわずかに寄る)", () => {
    expect(bearingBetween(tokyo, { lat: tokyo.lat, lng: tokyo.lng + 1 })).toBeCloseTo(90, 0);
    expect(bearingBetween(tokyo, { lat: tokyo.lat, lng: tokyo.lng - 1 })).toBeCloseTo(270, 0);
  });

  it("日付変更線(±180°)をまたいでも正しい方位角になる", () => {
    // 赤道上で 179°E → 179°W は真東(90°)
    expect(bearingBetween({ lat: 0, lng: 179 }, { lat: 0, lng: -179 })).toBeCloseTo(90, 6);
    // 逆向きは真西(270°)
    expect(bearingBetween({ lat: 0, lng: -179 }, { lat: 0, lng: 179 })).toBeCloseTo(270, 6);
    // 中緯度でもまたぎが 359° 台にならず東西として判定される
    expect(directionBetween({ lat: 35, lng: 179.5 }, { lat: 35, lng: -179.5 })).toBe("E");
    expect(directionBetween({ lat: 35, lng: -179.5 }, { lat: 35, lng: 179.5 })).toBe("W");
  });

  it("結果は常に 0 以上 360 未満", () => {
    const b = bearingBetween(tokyo, { lat: tokyo.lat + 0.1, lng: tokyo.lng - 0.1 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
    expect(directionOfBearing(b)).toBe("NW");
  });
});

describe("directionBetween(自宅から見た地点の8方位)", () => {
  const home = { lat: 35.6812, lng: 139.7671 };

  it("offsetPoint で各方位へ進んだ点は、その方位として判定される(往復整合)", () => {
    const all: Direction8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    for (const d of all) {
      const p = offsetPoint(home, bearingOf(d), 3);
      expect(directionBetween(home, p)).toBe(d);
    }
  });

  it("同一地点は方位を定義できないので undefined", () => {
    expect(directionBetween(home, { ...home })).toBeUndefined();
  });
});
