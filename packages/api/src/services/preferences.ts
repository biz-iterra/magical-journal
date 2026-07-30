/**
 * 「今日のジャーナル」設定の読み出し(生成へ渡す形へ変換)。
 *
 * 型・検証・既定値は @mj/batch(daily/preferences.ts)の定義を使い、二重定義を作らない。
 * 生成に渡すのは名前・カテゴリ・座標のみ(住所文字列は渡さない = プロンプトへ混入させない)。
 */

import {
  EMPTY_JOURNAL_SETTINGS,
  type FavoritePlace,
  type UserJournalSettings,
  type UserPreferences,
  isHolidayWeekdays,
  isTransportMode,
} from "@mj/batch";
import { getFavoritePlaces, getUserPreferences } from "../db/queries.js";

/**
 * holiday_weekdays(JSON 文字列)を安全にパースする。
 * 壊れた値・不正な値は null(= 既定の土日)として扱い、生成を止めない。
 */
export function parseHolidayWeekdays(raw: string | null): readonly number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isHolidayWeekdays(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * ユーザーの「今日のジャーナル」設定を生成用の形で返す。
 * 未設定(行なし・地点なし)なら EMPTY_JOURNAL_SETTINGS 相当 = 従来の既定挙動。
 */
export function loadJournalSettings(userId: number): UserJournalSettings {
  const row = getUserPreferences(userId);
  const places = getFavoritePlaces(userId);

  if (!row && places.length === 0) {
    return EMPTY_JOURNAL_SETTINGS;
  }

  const preferences: UserPreferences | null = row
    ? {
        wakeTime: row.wake_time,
        sleepTime: row.sleep_time,
        transportMode: isTransportMode(row.transport_mode) ? row.transport_mode : null,
        holidayWeekdays: parseHolidayWeekdays(row.holiday_weekdays),
      }
    : null;

  const favoritePlaces: FavoritePlace[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
  }));

  return { preferences, favoritePlaces };
}
