import { describe, expect, it } from "vitest";
import { matchFavoritePlaces } from "../daily/favorites.js";
import type { FavoritePlace } from "../daily/preferences.js";
import type { GoodDirectionInfo } from "../daily/structured.js";
import { bearingOf, offsetPoint } from "../places/geo.js";

const home = { lat: 35.6812, lng: 139.7671 };

/** 自宅から指定方位へ 2km の地点にお気に入り地点を作る */
function placeAt(
  id: number,
  name: string,
  direction: Parameters<typeof bearingOf>[0],
  category: string | null = null,
): FavoritePlace {
  const p = offsetPoint(home, bearingOf(direction), 2);
  return { id, name, category, lat: p.lat, lng: p.lng };
}

const north: GoodDirectionInfo = {
  direction: "N",
  label: "北",
  star: 3,
  starName: "三碧木星",
  level: "最大吉方",
};
const east: GoodDirectionInfo = {
  direction: "E",
  label: "東",
  star: 4,
  starName: "四緑木星",
  level: "吉方",
};

describe("matchFavoritePlaces(登録地点 × 当日の吉方位)", () => {
  it("吉方位に合致する地点だけを返す", () => {
    const places = [
      placeAt(1, "北のコワーキング", "N"),
      placeAt(2, "南のジム", "S"),
      placeAt(3, "東の図書館", "E"),
    ];
    const matched = matchFavoritePlaces(home, places, [north, east]);
    expect(matched.map((m) => m.place.name)).toEqual(["北のコワーキング", "東の図書館"]);
  });

  it("最大吉方の地点を吉方の地点より先に並べる", () => {
    const places = [
      placeAt(1, "東の図書館", "E"), // 吉方(登録順は先)
      placeAt(2, "北のコワーキング", "N"), // 最大吉方
    ];
    const matched = matchFavoritePlaces(home, places, [north, east]);
    expect(matched.map((m) => m.place.name)).toEqual(["北のコワーキング", "東の図書館"]);
    expect(matched[0]?.level).toBe("最大吉方");
    expect(matched[1]?.level).toBe("吉方");
  });

  it("同レベル内は登録順(id 順)を維持する", () => {
    const places = [placeAt(1, "北A", "N"), placeAt(2, "北B", "N")];
    const matched = matchFavoritePlaces(home, places, [north]);
    expect(matched.map((m) => m.place.name)).toEqual(["北A", "北B"]);
  });

  it("合致する地点が無ければ空配列(→ Places 検索へフォールバック)", () => {
    const places = [placeAt(1, "南のジム", "S"), placeAt(2, "西のカフェ", "W")];
    expect(matchFavoritePlaces(home, places, [north, east])).toEqual([]);
  });

  it("登録地点なし・吉方位なしはいずれも空配列", () => {
    expect(matchFavoritePlaces(home, [], [north])).toEqual([]);
    expect(matchFavoritePlaces(home, [placeAt(1, "北", "N")], [])).toEqual([]);
  });

  it("自宅と同一座標の地点は方位が定義できないため除外する", () => {
    const samePlace: FavoritePlace = {
      id: 9,
      name: "自宅そのもの",
      category: null,
      lat: home.lat,
      lng: home.lng,
    };
    expect(matchFavoritePlaces(home, [samePlace], [north, east])).toEqual([]);
  });

  it("方位判定は 30/60度方式の境界に従う(NE の範囲にある地点は N の吉方位には合致しない)", () => {
    // 北から 20°(= NE の範囲 15〜75°)の地点
    const p = offsetPoint(home, 20, 2);
    const place: FavoritePlace = { id: 1, name: "北北東の店", category: null, ...p };
    expect(matchFavoritePlaces(home, [place], [north])).toEqual([]);
    // NE が吉方位なら合致する
    const ne: GoodDirectionInfo = {
      direction: "NE",
      label: "北東",
      star: 8,
      starName: "八白土星",
      level: "吉方",
    };
    expect(matchFavoritePlaces(home, [place], [ne])).toHaveLength(1);
  });

  it("合致した地点には算出した方位と吉レベルが付く", () => {
    const matched = matchFavoritePlaces(home, [placeAt(1, "北の店", "N", "カフェ")], [north]);
    expect(matched[0]?.direction).toBe("N");
    expect(matched[0]?.level).toBe("最大吉方");
    expect(matched[0]?.place.category).toBe("カフェ");
  });
});
