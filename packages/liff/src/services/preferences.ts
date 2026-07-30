/**
 * 今日のジャーナルのカスタマイズ設定(活動時間帯・移動手段・休日曜日・よく行く場所)。
 *
 * これらは診断には影響せず、スケジュール提案の材料になるだけの設定
 * (診断入力は /api/profile 側)。fetch ラッパ・認証・エラー整形は api/client に委譲する。
 */

import { apiClient } from "../api/client";

/** 主な移動手段。提案される移動距離とスポット検索範囲が変わる */
export type TransportMode = "walk" | "bike" | "train" | "car";

export interface Preferences {
  /** 起床時刻 "HH:MM"。未設定なら null */
  readonly wakeTime: string | null;
  /** 就寝時刻 "HH:MM"。未設定なら null */
  readonly sleepTime: string | null;
  readonly transportMode: TransportMode | null;
  /** 明示的に設定された休日曜日(日曜=0 … 土曜=6)。未設定なら null */
  readonly holidayWeekdays: readonly number[] | null;
  /** 実際に適用される休日曜日。未設定時は既定の土日 [0,6] が入る */
  readonly effectiveHolidayWeekdays: readonly number[];
}

/** よく行く場所(行先候補) */
export interface FavoritePlace {
  readonly id: number;
  readonly name: string;
  readonly category: string | null;
  readonly addressText: string;
  readonly lat: number;
  readonly lng: number;
}

export interface PreferencesResponse {
  readonly preferences: Preferences;
  readonly places: readonly FavoritePlace[];
  /** サーバー側の上限(よく行く場所の件数) */
  readonly limits: { readonly places: number };
}

/**
 * 更新パッチ。キーを省略すれば変更しない / null を送れば未設定に戻す。
 * holidayWeekdays に空配列を送ると「休日なし」を明示できる。
 */
export interface PreferencesPatch {
  readonly wakeTime?: string | null;
  readonly sleepTime?: string | null;
  readonly transportMode?: TransportMode | null;
  readonly holidayWeekdays?: readonly number[] | null;
}

export interface AddPlaceInput {
  readonly name: string;
  readonly addressText: string;
  readonly lat: number;
  readonly lng: number;
  readonly category?: string;
}

/** 設定とよく行く場所をまとめて取得する */
export function getPreferences(): Promise<PreferencesResponse> {
  return apiClient.get<PreferencesResponse>("/api/preferences");
}

/** 設定を更新する(送ったキーのみ変更される) */
export function updatePreferences(patch: PreferencesPatch): Promise<{ preferences: Preferences }> {
  return apiClient.patch<{ preferences: Preferences }>("/api/preferences", patch);
}

/**
 * よく行く場所を追加する。座標は呼び出し側が Geocoding で解決してから渡す
 * (サーバーは Geocoding しない)。上限超過はサーバーが MJ-PREF-409 で拒否する。
 */
export function addFavoritePlace(input: AddPlaceInput): Promise<{ place: FavoritePlace }> {
  return apiClient.post<{ place: FavoritePlace }>("/api/preferences/places", input);
}

/** よく行く場所を削除する(更新 API は無いので、変更は削除→追加で行う) */
export function deleteFavoritePlace(id: number): Promise<{ deleted: number }> {
  return apiClient.delete<{ deleted: number }>(`/api/preferences/places/${String(id)}`);
}
