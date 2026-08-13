/**
 * 夜間バッチ本体(設計書§夜間バッチのフロー / 毎日 03:00 JST)。
 *
 *   1. アクティブユーザーを取得
 *   2. ユーザーごとに当日の構造化データを算出(engine + 暦マスタ = 決定的)
 *   3. 吉方位方向の実在スポットを Places で取得(キー無し/失敗時は一般提案へフォールバック)
 *   4. 構造化データ + スケジュール材料 + タイプ×char_style のトーンをプロンプトに注入し
 *      LLM で3セクション(fortune/schedule/characterNote)を JSON 生成 → パース
 *   5. daily_fortunes に upsert(directions_json・sections_json・fortune_text を保存)
 *
 * CLAUDE.md: 失敗ユーザーはスキップして続行し、失敗一覧をログに残す。Places の失敗は
 * ユーザーをスキップせず一般提案へフォールバックする(機能を止めない)。
 * 個人情報(生年月日・氏名・住所・座標)はログに出力しない(user_id のみ)。
 */

import type { CalendarProvider } from "@mj/engine";
import type { CharStyle } from "../data/personas.js";
import { getPersona } from "../data/personas.js";
import type { LlmProvider } from "../llm/provider.js";
import { bearingOf, offsetPoint } from "../places/geo.js";
import type { PlacesProvider } from "../places/provider.js";
import { NullPlacesProvider } from "../places/provider.js";
import { matchFavoritePlaces } from "./favorites.js";
import type { PlacesDistance, UserJournalSettings } from "./preferences.js";
import {
  EMPTY_JOURNAL_SETTINGS,
  FAVORITE_PLACES_IN_PROMPT,
  resolvePlacesDistance,
  resolveSchedulePreferences,
} from "./preferences.js";
import { type ScheduleMaterial, buildDailyPrompt } from "./prompt.js";
import type { DailySections } from "./sections.js";
import { parseDailySections } from "./sections.js";
import type { DailyStructured } from "./structured.js";
import { buildDailyStructured } from "./structured.js";

/**
 * バッチ処理対象ユーザー(方位・運勢の算出に必要な最小項目のみ)。
 * db/queries.ts の ActiveUser と同一構造(run.ts を DB 非依存に保つため再宣言)。
 * lat/lng は Places 用(スケジュールのスポット取得)。未設定なら一般提案になる。
 */
export interface ActiveUser {
  readonly userId: number;
  readonly birthDate: string;
  readonly birthTime: string | null;
  readonly charStyle: string;
  readonly lat: number | null;
  readonly lng: number | null;
}

/** 最小ロガー(差し替え可能) */
export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

const defaultLogger: Logger = {
  info: (m) => console.log(m),
  error: (m) => console.error(m),
};

export interface RunDailyDeps {
  readonly provider: LlmProvider;
  readonly calendar: CalendarProvider;
  /** 実在スポット取得(未指定なら NullPlacesProvider = 一般提案) */
  readonly places?: PlacesProvider;
  /** 自宅から吉方位方向へオフセットする距離(km)。未指定なら 3km */
  readonly placesOffsetKm?: number;
  /** オフセット点周辺の検索半径(m)。未指定なら 1500m */
  readonly placesRadiusMeters?: number;
  /** ユーザー取得(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly getUsers: () => ActiveUser[];
  /**
   * その日の運勢が生成済みか(index.ts が DB 実装を注入)。
   * 未指定なら常に生成する(従来挙動)。
   *
   * ★リクエストトリガー生成(GET /api/today)で当日分が既にあるユーザーを
   *   夜間バッチが再生成すると、同じ内容に LLM 代を二重に払うことになる。
   *   月次・性質バッチと同じくスキップする(--force で上書き可)。
   */
  readonly hasFortune?: (userId: number, date: string) => boolean;
  /**
   * ユーザーの「今日のジャーナル」設定取得(index.ts が DB 実装を注入)。
   * 未指定なら設定なし扱い = 従来の既定挙動。取得に失敗したユーザーは設定なしで続行する
   * (設定の取得失敗で運勢生成を止めない)。
   */
  readonly getSettings?: (userId: number) => UserJournalSettings;
  /** 保存(index.ts が DB 実装を注入。テストはフェイクを注入) */
  readonly saveFortune: (
    userId: number,
    date: string,
    directionsJson: string | null,
    fortuneText: string | null,
    sectionsJson: string | null,
  ) => void;
  readonly logger?: Logger;
  /** true なら生成済みでも再生成する */
  readonly force?: boolean;
}

export interface RunDailyFailure {
  readonly userId: number;
  readonly error: string;
}

export interface RunDailyResult {
  readonly date: string;
  readonly total: number;
  readonly succeeded: number;
  /** 生成済みだったためスキップした件数 */
  readonly skipped: number;
  readonly failed: readonly RunDailyFailure[];
}

/** char_style 文字列を CharStyle に正規化(不正値は undefined) */
function toCharStyle(raw: string): CharStyle | undefined {
  return raw === "male" || raw === "female" ? raw : undefined;
}

/** 吉方位から代表を1つ選ぶ(最大吉方を優先、無ければ吉方の先頭) */
function pickPrimaryGood(
  data: DailyStructured,
): DailyStructured["goodDirections"][number] | undefined {
  const great = data.goodDirections.find((d) => d.level === "最大吉方");
  return great ?? data.goodDirections[0];
}

/**
 * スケジュールの行先を決める(3段フォールバック。確定仕様の優先順)。
 *
 *   ① favorite: ユーザー登録の「よく行く場所」のうち、自宅から見た方位が当日の吉方位に
 *               合致するもの(方位はコード算出 = 決定的)。合致があれば最優先で採用する。
 *   ② places:   ①が無ければ、従来どおり吉方位方向へオフセットした点の周辺を Places で検索。
 *   ③ general:  ②も取れなければ方角ベースの一般提案(実在店名なし)。
 *
 * 座標なし/吉方位なし/Places 失敗のいずれでも ③ へフォールバックする。
 * ★ここでの失敗はユーザーをスキップしない(機能を止めない)。
 */
async function buildScheduleMaterial(
  user: ActiveUser,
  structured: DailyStructured,
  settings: UserJournalSettings,
  places: PlacesProvider,
  distance: PlacesDistance,
  logger: Logger,
): Promise<ScheduleMaterial> {
  if (user.lat == null || user.lng == null) {
    return { places: [], method: "general" };
  }
  const home = { lat: user.lat, lng: user.lng };

  // ① 登録地点のうち吉方位に合致するもの(最優先)。方位判定は決定的ロジック。
  const matched = matchFavoritePlaces(home, settings.favoritePlaces, structured.goodDirections);
  if (matched.length > 0) {
    return {
      // 名前とカテゴリのみをプロンプトへ渡す(住所・座標は渡さない)
      places: matched.slice(0, FAVORITE_PLACES_IN_PROMPT).map((m) => ({
        name: m.place.name,
        category: m.place.category ?? undefined,
      })),
      method: "favorite",
    };
  }

  // ② Places で吉方位方向の実在スポットを検索(従来どおり)
  const good = pickPrimaryGood(structured);
  if (!good) {
    return { places: [], method: "general" };
  }
  try {
    const point = offsetPoint(home, bearingOf(good.direction), distance.offsetKm);
    const results = await places.findNearby({ point, radiusMeters: distance.radiusMeters });
    if (results.length === 0) {
      // ③ 一般提案
      return { places: [], method: "general" };
    }
    return { places: results, method: "places" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 座標そのものは出さない(user_id のみ)。一般提案へフォールバック。
    logger.error(`[daily] user_id=${String(user.userId)} Places 取得失敗(一般提案へ): ${message}`);
    return { places: [], method: "general" };
  }
}

/**
 * 1 ユーザー分の当日データ生成に必要な依存。
 * DB は含めない(構造化データと3セクションを返すだけで、保存は呼び出し側の責務)。
 * runDailyBatch と API(/api/today の初回アクセス生成)の両方から使う共有ロジック。
 */
export interface GenerateDailyDeps {
  readonly provider: LlmProvider;
  readonly calendar: CalendarProvider;
  /** 実在スポット取得(未指定なら NullPlacesProvider = 一般提案) */
  readonly places?: PlacesProvider;
  /** 自宅から吉方位方向へオフセットする距離(km)。未指定なら 3km */
  readonly placesOffsetKm?: number;
  /** オフセット点周辺の検索半径(m)。未指定なら 1500m */
  readonly placesRadiusMeters?: number;
  /**
   * ユーザーの「今日のジャーナル」設定(お気に入り地点・活動時間帯・移動手段・休日曜日)。
   * 未指定なら設定なし扱いで従来の既定挙動になる(後方互換)。
   */
  readonly settings?: UserJournalSettings;
  readonly logger?: Logger;
}

/**
 * 1 ユーザー分の当日データ(構造化データ + 3セクション文章)を生成する。
 *
 *   2. 構造化データ(決定的: engine + 暦マスタ)
 *   3. スケジュール材料(実在スポット or 一般提案。失敗してもスキップしない)
 *   4. トーン注入 + LLM 生成(3セクション JSON)→ パース
 *
 * ★DB 保存はしない(呼び出し側が saveFortune 相当で保存する)。
 * パース失敗でもフォールバックで sections を返し、parsed=false を返す(機能は止めない)。
 * 構造化データ算出の失敗(暦マスタ範囲外など)は throw する(呼び出し側でスキップ判断)。
 */
export async function generateDailyForUser(
  user: ActiveUser,
  date: string,
  deps: GenerateDailyDeps,
): Promise<{ structured: DailyStructured; sections: DailySections; parsed: boolean }> {
  const logger = deps.logger ?? defaultLogger;
  const places = deps.places ?? new NullPlacesProvider();
  const settings = deps.settings ?? EMPTY_JOURNAL_SETTINGS;

  // 距離パラメータ: ユーザーの移動手段設定を優先し、無ければ env 既定へフォールバック
  const distance = resolvePlacesDistance(settings.preferences, {
    offsetKm: deps.placesOffsetKm ?? 3,
    radiusMeters: deps.placesRadiusMeters ?? 1500,
  });

  // 2. 構造化データ(決定的)
  const structured = buildDailyStructured(
    { birthDate: user.birthDate, birthTime: user.birthTime, date },
    deps.calendar,
  );

  // 3. スケジュール材料(登録地点 → Places → 一般提案の3段。失敗してもスキップしない)
  const material = await buildScheduleMaterial(
    user,
    structured,
    settings,
    places,
    distance,
    logger,
  );

  // 4. トーン注入 + ユーザー設定 + LLM 生成(3セクション JSON)→ パース
  const style = toCharStyle(user.charStyle);
  const persona = style ? getPersona(structured.potentialType, style) : undefined;
  const prefs = resolveSchedulePreferences(date, settings.preferences);
  const prompt = buildDailyPrompt(structured, persona, material, prefs);
  const raw = await deps.provider.generate(prompt);
  const { sections, parsed } = parseDailySections(raw);
  if (!parsed) {
    // 機能は止めない(フォールバックで保存)が、失敗として記録に残す
    logger.error(
      `[daily] user_id=${String(user.userId)} セクション JSON パース失敗(フォールバック保存)`,
    );
  }

  return { structured, sections, parsed };
}

/**
 * 指定日の日次運勢バッチを実行する(1 回実行)。
 * @param date 対象日付 "YYYY-MM-DD"(JST)
 */
export async function runDailyBatch(date: string, deps: RunDailyDeps): Promise<RunDailyResult> {
  const logger = deps.logger ?? defaultLogger;
  const { getUsers, saveFortune, hasFortune } = deps;
  const places = deps.places ?? new NullPlacesProvider();
  const force = deps.force ?? false;

  const users = getUsers();
  logger.info(
    `[daily] date=${date} provider=${deps.provider.name} places=${places.name} users=${String(users.length)} 開始`,
  );

  const failed: RunDailyFailure[] = [];
  let succeeded = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      // 冪等性: 既に当日分が生成済みならスキップ(LLM と Places を無駄に呼ばない)。
      // リクエストトリガーで生成済みのユーザー、および部分失敗後の再実行で効く。
      if (!force && hasFortune?.(user.userId, date)) {
        skipped += 1;
        continue;
      }

      // ユーザー設定(お気に入り地点・活動時間帯・移動手段・休日曜日)。
      // 取得失敗は握りつぶさずログに残し、設定なしで生成を続行する(運勢を止めない)。
      let settings: UserJournalSettings | undefined;
      if (deps.getSettings) {
        try {
          settings = deps.getSettings(user.userId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(
            `[daily] user_id=${String(user.userId)} 設定取得に失敗(既定挙動で続行): ${message}`,
          );
        }
      }

      // 1 ユーザー分の生成(構造化データ + 3セクション)。API と共有する純関数。
      const { structured, sections } = await generateDailyForUser(user, date, {
        provider: deps.provider,
        calendar: deps.calendar,
        places,
        placesOffsetKm: deps.placesOffsetKm,
        placesRadiusMeters: deps.placesRadiusMeters,
        settings,
        logger,
      });

      // 5. 保存(fortune_text は後方互換で運勢=fortune を格納)
      saveFortune(
        user.userId,
        date,
        JSON.stringify(structured),
        sections.fortune || null,
        JSON.stringify(sections),
      );
      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ userId: user.userId, error: message });
      // 個人情報は出さない(user_id のみ)
      logger.error(`[daily] user_id=${String(user.userId)} 失敗: ${message}`);
    }
  }

  const result: RunDailyResult = {
    date,
    total: users.length,
    succeeded,
    skipped,
    failed,
  };
  logger.info(
    // skip= を必ず出す。出さないと「ok=0 ng=0」がスキップなのか対象ゼロなのか判別できない
    `[daily] date=${date} 完了 total=${String(result.total)} ok=${String(succeeded)} skip=${String(skipped)} ng=${String(failed.length)}`,
  );
  return result;
}
