/**
 * PlacesProvider ファクトリ。
 *
 * GOOGLE_PLACES_API_KEY があれば GooglePlacesProvider、無ければ NullPlacesProvider
 * (常に空配列 = 実在店名なしの一般提案へフォールバック)を返す。
 * どちらでも機能は止めない(CLAUDE.md「失敗はスキップして続行」)。
 */

import type { BatchConfig } from "../config.js";
import { GooglePlacesProvider } from "./google.js";
import { NullPlacesProvider, type PlacesProvider } from "./provider.js";

/**
 * config に従って PlacesProvider を生成する。
 * キー未設定は正常系(フォールバック)なので例外にしない。
 */
export function createPlacesProvider(config: BatchConfig): PlacesProvider {
  if (config.googlePlacesApiKey) {
    return new GooglePlacesProvider({ apiKey: config.googlePlacesApiKey });
  }
  return new NullPlacesProvider();
}
