/**
 * 「今日のジャーナルを自分好みにする設定」の型と決定的な解決ロジック(純関数)。
 *
 * 対象は4種類(すべてスケジュール生成に反映する):
 *   1. よく行く場所(お気に入り地点) — 自宅から見た方位が吉方位に合致すれば行先として優先採用
 *   2. 活動時間帯(起床/就寝)         — スケジュールのタイムラインをこの範囲に収める
 *   3. 移動手段                       — Places のオフセット距離・検索半径に反映
 *   4. 休日にする曜日                 — 対象日の曜日で仕事/休日モードを自動判定
 *
 * CLAUDE.md ルール1: 曜日判定・方位判定・距離パラメータの決定はすべてコードで行う(LLM は文章化のみ)。
 * 設定が未設定(すべて null / 行なし)のときは従来の既定挙動になること。
 */

/** 移動手段 */
export type TransportMode = "walk" | "bike" | "train" | "car";

/** 移動手段の一覧(検証用) */
export const TRANSPORT_MODES: readonly TransportMode[] = ["walk", "bike", "train", "car"];

/** ユーザー設定(未設定項目は null)。DB の user_preferences 1 行に対応 */
export interface UserPreferences {
  /** 起床時刻 "HH:MM"。null=未設定 */
  readonly wakeTime: string | null;
  /** 就寝時刻 "HH:MM"。null=未設定 */
  readonly sleepTime: string | null;
  /** 移動手段。null=未設定(env の既定距離を使う) */
  readonly transportMode: TransportMode | null;
  /** 休日にする曜日(0=日 … 6=土)。null=未設定(既定は土日) */
  readonly holidayWeekdays: readonly number[] | null;
}

/**
 * お気に入り地点1件(生成で使う最小情報)。
 * ★住所文字列はここに含めない(プロンプトへ個人の住所を混入させないため。
 *   API の応答では返すが、生成の材料としては「名前」と方位の合致情報のみを使う)。
 */
export interface FavoritePlace {
  readonly id: number;
  readonly name: string;
  readonly category: string | null;
  readonly lat: number;
  readonly lng: number;
}

/** ユーザーの「今日のジャーナル」設定一式(未設定なら preferences=null / favoritePlaces=[]) */
export interface UserJournalSettings {
  readonly preferences: UserPreferences | null;
  readonly favoritePlaces: readonly FavoritePlace[];
}

/** 設定が一切ない状態(従来挙動と同一) */
export const EMPTY_JOURNAL_SETTINGS: UserJournalSettings = {
  preferences: null,
  favoritePlaces: [],
};

/** 休日にする曜日の既定値(土日)。0=日 … 6=土 */
export const DEFAULT_HOLIDAY_WEEKDAYS: readonly number[] = [0, 6];

/** お気に入り地点の登録上限(サーバー側の上限。超過は API がエラーコードで拒否する) */
export const FAVORITE_PLACES_LIMIT = 10;

/** スケジュールで提示するお気に入り地点の最大件数(プロンプトが冗長になるのを防ぐ) */
export const FAVORITE_PLACES_IN_PROMPT = 3;

/** Places 検索の距離パラメータ */
export interface PlacesDistance {
  /** 自宅から吉方位方向へオフセットする距離(km) */
  readonly offsetKm: number;
  /** オフセット点周辺の検索半径(m) */
  readonly radiusMeters: number;
}

/**
 * 移動手段ごとの距離パラメータ(確定仕様)。
 * 徒歩 1km/800m、自転車 3km/1500m、電車 5km/2000m、車 10km/3000m。
 */
export const TRANSPORT_DISTANCE: Readonly<Record<TransportMode, PlacesDistance>> = {
  walk: { offsetKm: 1, radiusMeters: 800 },
  bike: { offsetKm: 3, radiusMeters: 1500 },
  train: { offsetKm: 5, radiusMeters: 2000 },
  car: { offsetKm: 10, radiusMeters: 3000 },
};

/** 移動手段の日本語ラベル(プロンプト用) */
const TRANSPORT_LABELS: Readonly<Record<TransportMode, string>> = {
  walk: "徒歩",
  bike: "自転車",
  train: "電車",
  car: "車",
};

/** 移動手段の日本語ラベルを返す */
export function transportLabel(mode: TransportMode): string {
  return TRANSPORT_LABELS[mode];
}

/** 値が TransportMode かを判定する(API の入力検証にも使う) */
export function isTransportMode(value: unknown): value is TransportMode {
  return typeof value === "string" && (TRANSPORT_MODES as readonly string[]).includes(value);
}

/** "HH:MM"(00:00〜23:59)かを判定する */
export function isTimeOfDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(3, 5));
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** 休日曜日の配列(0〜6 の整数・重複なし)かを判定する */
export function isHolidayWeekdays(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  if (value.length > 7) return false;
  const seen = new Set<number>();
  for (const v of value) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 6) return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return true;
}

/**
 * "YYYY-MM-DD"(JST の暦日)の曜日を返す(0=日 … 6=土)。
 *
 * CLAUDE.md: Date の直接生成によるタイムゾーン事故を避けるため、UTC 固定で組み立てて
 * getUTCDay() を使う(ローカルタイムゾーンに依存しない = どの環境でも同じ結果)。
 */
export function weekdayOf(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) {
    throw new Error(`date は YYYY-MM-DD 形式で指定してください (got "${date}")`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * 対象日が休日かを判定する。設定が未設定(null / holidayWeekdays=null)なら既定の土日で判定する。
 */
export function isHoliday(date: string, prefs: UserPreferences | null | undefined): boolean {
  const holidays = prefs?.holidayWeekdays ?? DEFAULT_HOLIDAY_WEEKDAYS;
  return holidays.includes(weekdayOf(date));
}

/**
 * Places 検索の距離パラメータを決定する。
 * ユーザー設定(移動手段)があればそれを優先し、無ければ env 既定へフォールバックする。
 */
export function resolvePlacesDistance(
  prefs: UserPreferences | null | undefined,
  fallback: PlacesDistance,
): PlacesDistance {
  const mode = prefs?.transportMode;
  return mode ? TRANSPORT_DISTANCE[mode] : fallback;
}

/** プロンプトに渡すスケジュール設定(解決済み。方位・座標・住所は含めない) */
export interface ResolvedSchedulePreferences {
  /** 起床時刻 "HH:MM"。未設定なら null */
  readonly wakeTime: string | null;
  /** 就寝時刻 "HH:MM"。未設定なら null */
  readonly sleepTime: string | null;
  /** 移動手段。未設定なら null */
  readonly transportMode: TransportMode | null;
  /** 対象日が休日か(既定は土日) */
  readonly isHoliday: boolean;
}

/**
 * 対象日とユーザー設定から、プロンプトに渡す解決済み設定を作る。
 * prefs が null(未設定)でも isHoliday は既定の土日で決まる(生成が壊れない)。
 */
export function resolveSchedulePreferences(
  date: string,
  prefs: UserPreferences | null | undefined,
): ResolvedSchedulePreferences {
  return {
    wakeTime: prefs?.wakeTime ?? null,
    sleepTime: prefs?.sleepTime ?? null,
    transportMode: prefs?.transportMode ?? null,
    isHoliday: isHoliday(date, prefs),
  };
}
