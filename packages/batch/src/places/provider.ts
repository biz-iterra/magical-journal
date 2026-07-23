/**
 * 実在スポット取得の抽象化(Places)。
 *
 * スケジュール生成の「材料」として、吉方位方向の実在スポット名を取得する。
 * Google Places に依存しない interface にし、テストではモック、
 * キー未設定・API 失敗時は NullPlacesProvider(空配列)へフォールバックできるようにする。
 *
 * CLAUDE.md: シークレット(キー)は env 経由のみ・ログ非出力。個人情報(自宅座標)はログに出さない。
 */

import type { LatLng } from "./geo.js";

/** 取得した実在スポット1件(スケジュール文の材料。生成側で必要な最小情報のみ) */
export interface PlaceCandidate {
  /** スポット名(例「〇〇珈琲店」) */
  readonly name: string;
  /** 周辺の目印(例「〇〇駅前」)。取得できなければ undefined */
  readonly vicinity?: string;
  /** 種別ラベル(例「カフェ」「公園」)。取得できなければ undefined */
  readonly category?: string;
}

/** Nearby 検索の条件 */
export interface NearbyQuery {
  /** 検索中心(自宅から吉方位方向へオフセットした点) */
  readonly point: LatLng;
  /** 検索半径(m) */
  readonly radiusMeters: number;
  /** 最大取得件数(既定はプロバイダ実装依存) */
  readonly limit?: number;
}

/** Places プロバイダ共通インターフェース */
export interface PlacesProvider {
  /** プロバイダ識別名(ログ用。シークレットは含めない) */
  readonly name: string;
  /**
   * 指定点の周辺スポットを返す。失敗時は例外を投げる(呼び出し側がフォールバック判断する)。
   */
  findNearby(query: NearbyQuery): Promise<PlaceCandidate[]>;
}

/**
 * NullPlacesProvider — キー未設定時のフォールバック。
 * 常に空配列を返す(= 実在店名なしの一般提案でスケジュールを生成させる)。
 */
export class NullPlacesProvider implements PlacesProvider {
  readonly name = "null";
  findNearby(_query: NearbyQuery): Promise<PlaceCandidate[]> {
    return Promise.resolve([]);
  }
}
