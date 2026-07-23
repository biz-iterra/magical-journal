/**
 * 住所 → 緯度経度変換(Geocoding)。
 *
 * Google Maps JS API の Geocoder を使用する。地図表示(direction-map)と
 * 同じローダーを共用し、API は一度だけロードされる。
 * 地図プロバイダ差替時はこのファイルを差し替える(抽象化境界)。
 */

import { loadGoogleMaps } from "../components/direction-map/google-maps-provider";

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * 住所文字列を緯度経度に変換する。
 *
 * @returns 変換結果。API キー未設定の開発環境では null(登録は座標なしで継続)
 * @throws 変換失敗(該当なし・API エラー)の場合
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

  if (!apiKey) {
    // 本番でキー未設定は構成ミスとして明示的に失敗させる。
    // 開発モードのみ座標なしで続行を許す(方位マップが出ないだけ)
    if (import.meta.env.DEV) {
      console.warn("[geocode] VITE_GOOGLE_MAPS_API_KEY 未設定のため座標なしで続行します");
      return null;
    }
    throw new Error("地図サービスの設定に問題があります。管理者にお問い合わせください");
  }

  await loadGoogleMaps(apiKey);

  const geocoder = new google.maps.Geocoder();

  try {
    // キーのリファラー制限違反等では応答が返らないことがあるため、
    // タイムアウトを設けて登録フローが固まらないようにする
    const { results } = await withTimeout(geocoder.geocode({ address, region: "jp" }), 10_000);
    const location = results[0]?.geometry.location;
    if (!location) {
      throw new Error("NO_RESULT");
    }
    return { lat: location.lat(), lng: location.lng() };
  } catch {
    throw new Error(
      "住所から位置を特定できませんでした。市区町村からの住所を確認して入力してください",
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("GEOCODE_TIMEOUT")), ms);
    }),
  ]);
}
