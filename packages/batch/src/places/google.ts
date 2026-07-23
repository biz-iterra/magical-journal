/**
 * GooglePlacesProvider — Google Places Nearby Search 実装。
 *
 * サーバー用キー(リファラー制限なし)を env 経由で受け取る。キーはログに出さない。
 * 取得するのは公開スポットの一般情報(名称・目印・種別)のみで、個人情報は扱わない。
 * 失敗時は例外を投げ、呼び出し側(daily/run)が「一般提案」へフォールバックする。
 */

import type { NearbyQuery, PlaceCandidate, PlacesProvider } from "./provider.js";

const NEARBY_ENDPOINT = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

/** Nearby Search の生活行動向け種別(散歩・立ち寄り先として妥当なもの) */
const DEFAULT_TYPES = ["cafe", "park", "restaurant", "book_store", "art_gallery"] as const;

/** 種別 → 日本語の軽いラベル(スケジュール文の材料。厳密でなくてよい) */
const TYPE_LABELS: Readonly<Record<string, string>> = {
  cafe: "カフェ",
  park: "公園",
  restaurant: "飲食店",
  book_store: "書店",
  art_gallery: "ギャラリー",
  bakery: "ベーカリー",
  library: "図書館",
  tourist_attraction: "観光スポット",
};

interface NearbyResult {
  readonly name?: string;
  readonly vicinity?: string;
  readonly types?: readonly string[];
}

interface NearbyResponse {
  readonly status?: string;
  readonly results?: readonly NearbyResult[];
  readonly error_message?: string;
}

export interface GooglePlacesOptions {
  readonly apiKey: string;
  /** 取得件数の上限(既定 5) */
  readonly limit?: number;
  /** fetch 実装(テストで注入可能に) */
  readonly fetchImpl?: typeof fetch;
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly name = "google-places";
  private readonly apiKey: string;
  private readonly limit: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GooglePlacesOptions) {
    if (!opts.apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY が未設定です");
    }
    this.apiKey = opts.apiKey;
    this.limit = opts.limit ?? 5;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async findNearby(query: NearbyQuery): Promise<PlaceCandidate[]> {
    const { point, radiusMeters } = query;
    const params = new URLSearchParams({
      location: `${String(point.lat)},${String(point.lng)}`,
      radius: String(radiusMeters),
      language: "ja",
      type: DEFAULT_TYPES[0],
      key: this.apiKey,
    });

    const res = await this.fetchImpl(`${NEARBY_ENDPOINT}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`GooglePlaces: HTTP ${String(res.status)}`);
    }
    const body = (await res.json()) as NearbyResponse;

    // ZERO_RESULTS は正常(候補なし)。それ以外の非 OK はエラー(キー・課金・制限など)。
    if (body.status === "ZERO_RESULTS") {
      return [];
    }
    if (body.status !== "OK") {
      // error_message にキーは含まれない(Google 仕様)。ログは呼び出し側で最小限に。
      throw new Error(`GooglePlaces: status=${body.status ?? "unknown"}`);
    }

    const results = body.results ?? [];
    const candidates: PlaceCandidate[] = [];
    for (const r of results) {
      if (!r.name) continue;
      candidates.push({
        name: r.name,
        vicinity: r.vicinity,
        category: pickCategory(r.types),
      });
      if (candidates.length >= this.limit) break;
    }
    return candidates;
  }
}

/** types 配列から最初に該当する日本語ラベルを拾う(なければ undefined) */
function pickCategory(types: readonly string[] | undefined): string | undefined {
  if (!types) return undefined;
  for (const t of types) {
    const label = TYPE_LABELS[t];
    if (label) return label;
  }
  return undefined;
}
