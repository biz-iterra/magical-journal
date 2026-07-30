/**
 * Google マップのテキスト検索(Place Autocomplete)で場所を選ぶ入力欄。
 *
 * 「スターバックス渋谷」のような店名でも検索でき、選ぶと
 * 名前・住所・緯度経度が一度に確定する(住所を打って Geocoding するより確実)。
 *
 * ★2025-03 以降、旧 `google.maps.places.Autocomplete` は新規利用できないため、
 *   新しい `PlaceAutocompleteElement`(Web Component)を使う。
 * ★Maps キー未設定・Places 未許可・読み込み失敗のいずれでも壊さない。
 *   その場合は何も描画せず、呼び出し側の手入力フォームだけが残る(フォールバック)。
 */

import { useEffect, useRef, useState } from "react";
import * as s from "./PlaceSearchField.css";
import { loadGoogleMaps } from "./direction-map/google-maps-provider";

/** 選択された場所(登録に必要な情報だけを取り出したもの) */
export interface SelectedPlace {
  /** 表示名(例: 「スターバックス 渋谷店」) */
  readonly name: string;
  /** 整形済み住所 */
  readonly addressText: string;
  readonly lat: number;
  readonly lng: number;
}

interface PlaceSearchFieldProps {
  /** 場所が選ばれたときに呼ばれる */
  readonly onSelect: (place: SelectedPlace) => void;
}

export function PlaceSearchField({ onSelect }: PlaceSearchFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 呼び出し側が毎回新しい関数を渡しても要素を作り直さないよう ref で保持する
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
    if (!apiKey) return;

    let cancelled = false;
    let element: google.maps.places.PlaceAutocompleteElement | null = null;

    (async () => {
      try {
        await loadGoogleMaps(apiKey);
        // 新 Places ライブラリを読み込む(キーで Places API が未許可ならここで失敗する)
        const { PlaceAutocompleteElement } = (await google.maps.importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;
        if (cancelled) return;

        element = new PlaceAutocompleteElement({
          // 日本語表記・日本国内に絞る(海外の同名店が並ぶのを防ぐ)
          requestedLanguage: "ja",
          requestedRegion: "jp",
          includedRegionCodes: ["jp"],
        });
        element.style.width = "100%";

        element.addEventListener("gmp-select", (event) => {
          void (async () => {
            const prediction = (event as unknown as { placePrediction?: unknown }).placePrediction;
            const detail = (event as unknown as { detail?: { placePrediction?: unknown } }).detail;
            const target = prediction ?? detail?.placePrediction;
            if (!target) return;

            try {
              const place = (target as { toPlace: () => google.maps.places.Place }).toPlace();
              await place.fetchFields({
                fields: ["displayName", "formattedAddress", "location"],
              });
              const lat = place.location?.lat();
              const lng = place.location?.lng();
              if (lat == null || lng == null) return;

              onSelectRef.current({
                name: place.displayName ?? "",
                addressText: place.formattedAddress ?? "",
                lat,
                lng,
              });
            } catch {
              // 詳細取得に失敗しても手入力は使えるので、UI は壊さない
            }
          })();
        });

        containerRef.current?.appendChild(element);
        setAvailable(true);
      } catch {
        // Places が使えない構成(キー制限・未有効化など)。手入力にフォールバックする
        setAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
      element?.remove();
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} />
      {available && (
        <p className={s.hint}>店名や施設名でも検索できます。選ぶと名前・住所が自動で入ります</p>
      )}
    </div>
  );
}
