/**
 * お気に入り地点(よく行く場所)と当日の吉方位の突合(決定的ロジック)。
 *
 * 自宅座標から各地点への方位角をコードで求め(真北基準・30/60度方式)、
 * その日の吉方位に合致する地点だけを行先候補として返す。
 *
 * CLAUDE.md ルール1: 方位判定は LLM にやらせない。ここで確定した「名前」と
 * 「合致した吉レベル」のみをプロンプトへ渡す(座標・住所は渡さない)。
 */

import type { Direction8 } from "@mj/engine";
import type { LatLng } from "../places/geo.js";
import { directionBetween } from "../places/geo.js";
import type { FavoritePlace } from "./preferences.js";
import type { GoodDirectionInfo } from "./structured.js";

/** 吉方位に合致したお気に入り地点1件 */
export interface FavoriteMatch {
  readonly place: FavoritePlace;
  /** 自宅から見た方位(コード算出) */
  readonly direction: Direction8;
  /** 合致した吉レベル */
  readonly level: GoodDirectionInfo["level"];
}

/** 最大吉方を先に、次に吉方(同レベル内は登録順を維持) */
const LEVEL_ORDER: Readonly<Record<GoodDirectionInfo["level"], number>> = {
  最大吉方: 0,
  吉方: 1,
};

/**
 * 自宅から見て「その日の吉方位」に当たるお気に入り地点を抽出する。
 *
 * @param home 自宅座標
 * @param favorites 登録済みのお気に入り地点(登録順)
 * @param goodDirections 当日の吉方位(最大吉方 / 吉方)
 * @returns 最大吉方 → 吉方 の順に並べた合致地点(該当なしなら空配列)
 */
export function matchFavoritePlaces(
  home: LatLng,
  favorites: readonly FavoritePlace[],
  goodDirections: readonly GoodDirectionInfo[],
): FavoriteMatch[] {
  if (favorites.length === 0 || goodDirections.length === 0) {
    return [];
  }

  // 方位 → 吉レベル(同じ方位が複数入ることはないが、最初の定義を採用する)
  const levelByDirection = new Map<Direction8, GoodDirectionInfo["level"]>();
  for (const good of goodDirections) {
    if (!levelByDirection.has(good.direction)) {
      levelByDirection.set(good.direction, good.level);
    }
  }

  const matches: FavoriteMatch[] = [];
  for (const place of favorites) {
    const direction = directionBetween(home, { lat: place.lat, lng: place.lng });
    if (!direction) continue; // 自宅と同一地点 = 方位を定義できない
    const level = levelByDirection.get(direction);
    if (!level) continue;
    matches.push({ place, direction, level });
  }

  // 安定ソート(Array#sort は ES2019 以降で安定)。同レベル内は登録順が保たれる。
  return matches.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
