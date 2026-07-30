/**
 * 「今日のジャーナル設定」がスケジュール生成に反映されることの検証。
 *
 *   - 場所決定の3段フォールバック(登録地点 → Places → 一般提案)
 *   - 移動手段ごとの距離パラメータ(オフセット距離 / 検索半径)
 *   - 活動時間帯・休日曜日のプロンプト反映
 *   - 設定が全て未設定なら従来挙動と同じであること
 */

import { MasterCalendarProvider } from "@mj/calendar-data";
import type { Direction8 } from "@mj/engine";
import { describe, expect, it } from "vitest";
import type { FavoritePlace, UserJournalSettings, UserPreferences } from "../daily/preferences.js";
import type { ActiveUser } from "../daily/run.js";
import { generateDailyForUser, runDailyBatch } from "../daily/run.js";
import { buildDailyStructured } from "../daily/structured.js";
import { MockLlmProvider } from "../llm/mock.js";
import type { LlmPrompt, LlmProvider } from "../llm/provider.js";
import { bearingOf, offsetPoint } from "../places/geo.js";
import type { NearbyQuery, PlaceCandidate, PlacesProvider } from "../places/provider.js";

const calendar = new MasterCalendarProvider();
const silentLogger = { info: () => undefined, error: () => undefined };

/** 東京駅付近を自宅とするユーザー */
const HOME = { lat: 35.6812, lng: 139.7671 };
const DATE = "2026-07-23"; // 木曜(平日)
const SATURDAY = "2026-08-01"; // 土曜(既定では休日)

const user: ActiveUser = {
  userId: 1,
  birthDate: "1990-05-17",
  birthTime: null,
  charStyle: "male",
  lat: HOME.lat,
  lng: HOME.lng,
};

/** プロンプトを記録しつつ Mock の出力を返す LLM プロバイダ */
class RecordingLlmProvider implements LlmProvider {
  readonly name = "recording";
  readonly prompts: LlmPrompt[] = [];
  private readonly inner = new MockLlmProvider();

  generate(prompt: LlmPrompt): Promise<string> {
    this.prompts.push(prompt);
    return this.inner.generate(prompt);
  }

  get last(): LlmPrompt {
    const p = this.prompts.at(-1);
    if (!p) throw new Error("プロンプトが記録されていません");
    return p;
  }
}

/** 検索条件を記録するフェイク Places */
class RecordingPlacesProvider implements PlacesProvider {
  readonly name = "recording-places";
  readonly queries: NearbyQuery[] = [];
  constructor(private readonly results: PlaceCandidate[]) {}

  findNearby(query: NearbyQuery): Promise<PlaceCandidate[]> {
    this.queries.push(query);
    return Promise.resolve(this.results);
  }

  get last(): NearbyQuery {
    const q = this.queries.at(-1);
    if (!q) throw new Error("Places が呼ばれていません");
    return q;
  }
}

/** 常に失敗する Places(フォールバック検証用) */
class FailingPlacesProvider implements PlacesProvider {
  readonly name = "failing-places";
  findNearby(_query: NearbyQuery): Promise<PlaceCandidate[]> {
    return Promise.reject(new Error("upstream error"));
  }
}

function prefs(partial: Partial<UserPreferences> = {}): UserPreferences {
  return {
    wakeTime: null,
    sleepTime: null,
    transportMode: null,
    holidayWeekdays: null,
    ...partial,
  };
}

function settings(partial: Partial<UserJournalSettings> = {}): UserJournalSettings {
  return { preferences: null, favoritePlaces: [], ...partial };
}

/** 当日の最大吉方(無ければ吉方)の方位を実データから求める */
function primaryGoodDirection(date: string) {
  const structured = buildDailyStructured(
    { birthDate: user.birthDate, birthTime: user.birthTime, date },
    calendar,
  );
  const good =
    structured.goodDirections.find((d) => d.level === "最大吉方") ?? structured.goodDirections[0];
  if (!good) throw new Error(`${date} に吉方位がないためテストに使えません`);
  return good;
}

/** 当日の吉方位ではない方位を1つ返す(登録地点が合致しないケースの検証用) */
function nonGoodDirection(date: string): Direction8 {
  const structured = buildDailyStructured(
    { birthDate: user.birthDate, birthTime: user.birthTime, date },
    calendar,
  );
  const good = new Set(structured.goodDirections.map((d) => d.direction));
  const all: Direction8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const found = all.find((d) => !good.has(d));
  if (!found) throw new Error(`${date} は全方位が吉方位のためテストに使えません`);
  return found;
}

/** 指定方位へ 2km の位置にお気に入り地点を作る */
function favoriteAt(
  id: number,
  name: string,
  direction: Parameters<typeof bearingOf>[0],
  category: string | null = null,
): FavoritePlace {
  const p = offsetPoint(HOME, bearingOf(direction), 2);
  return { id, name, category, lat: p.lat, lng: p.lng };
}

describe("場所決定の3段フォールバック", () => {
  it("① 登録地点が吉方位にあれば Places を呼ばずにそれを行先にする", async () => {
    const good = primaryGoodDirection(DATE);
    const places = new RecordingPlacesProvider([{ name: "検索で出た店" }]);
    const provider = new RecordingLlmProvider();

    await generateDailyForUser(user, DATE, {
      provider,
      calendar,
      places,
      logger: silentLogger,
      settings: settings({
        favoritePlaces: [favoriteAt(1, "◯◯コワーキング", good.direction, "コワーキング")],
      }),
    });

    // Places は呼ばれない(登録地点が最優先)
    expect(places.queries).toHaveLength(0);
    expect(provider.last.user).toContain("◯◯コワーキング");
    expect(provider.last.user).toContain("※ユーザーが登録した場所(名前をそのまま使う)");
    expect(provider.last.user).not.toContain("検索で出た店");
  });

  it("② 登録地点が吉方位に無ければ Places 検索の結果を使う", async () => {
    const notGood = nonGoodDirection(DATE);
    const places = new RecordingPlacesProvider([{ name: "みどり珈琲店", category: "カフェ" }]);
    const provider = new RecordingLlmProvider();

    await generateDailyForUser(user, DATE, {
      provider,
      calendar,
      places,
      logger: silentLogger,
      settings: settings({ favoritePlaces: [favoriteAt(1, "遠くのジム", notGood)] }),
    });

    expect(places.queries).toHaveLength(1);
    expect(provider.last.user).toContain("みどり珈琲店");
    expect(provider.last.user).not.toContain("遠くのジム");
    // Places 由来なので「登録した場所」の指示は付かない
    expect(provider.last.system).not.toContain("ユーザー自身が登録した場所");
  });

  it("③ 登録地点も無く Places も空なら一般提案になる", async () => {
    const places = new RecordingPlacesProvider([]);
    const provider = new RecordingLlmProvider();

    await generateDailyForUser(user, DATE, {
      provider,
      calendar,
      places,
      logger: silentLogger,
      settings: settings(),
    });

    expect(places.queries).toHaveLength(1);
    expect(provider.last.user).toContain("スケジュール用スポット: なし");
  });

  it("③ Places が失敗しても一般提案へフォールバックし、ユーザーをスキップしない", async () => {
    const provider = new RecordingLlmProvider();
    const gen = await generateDailyForUser(user, DATE, {
      provider,
      calendar,
      places: new FailingPlacesProvider(),
      logger: silentLogger,
      settings: settings(),
    });
    expect(gen.parsed).toBe(true);
    expect(provider.last.user).toContain("スケジュール用スポット: なし");
  });

  it("自宅座標が無ければ登録地点の方位を出せないので一般提案になる", async () => {
    const places = new RecordingPlacesProvider([{ name: "検索で出た店" }]);
    const provider = new RecordingLlmProvider();
    const good = primaryGoodDirection(DATE);

    await generateDailyForUser({ ...user, lat: null, lng: null }, DATE, {
      provider,
      calendar,
      places,
      logger: silentLogger,
      settings: settings({ favoritePlaces: [favoriteAt(1, "◯◯コワーキング", good.direction)] }),
    });

    expect(places.queries).toHaveLength(0);
    expect(provider.last.user).toContain("スケジュール用スポット: なし");
  });
});

describe("移動手段ごとの距離パラメータ", () => {
  const cases = [
    { mode: "walk", offsetKm: 1, radiusMeters: 800 },
    { mode: "bike", offsetKm: 3, radiusMeters: 1500 },
    { mode: "train", offsetKm: 5, radiusMeters: 2000 },
    { mode: "car", offsetKm: 10, radiusMeters: 3000 },
  ] as const;

  for (const { mode, offsetKm, radiusMeters } of cases) {
    it(`${mode}: オフセット ${String(offsetKm)}km / 半径 ${String(radiusMeters)}m が検索に反映される`, async () => {
      const good = primaryGoodDirection(DATE);
      const places = new RecordingPlacesProvider([{ name: "スポット" }]);

      await generateDailyForUser(user, DATE, {
        provider: new MockLlmProvider(),
        calendar,
        places,
        // env 既定はあえて別値にしておき、設定が優先されることを見る
        placesOffsetKm: 3,
        placesRadiusMeters: 1500,
        logger: silentLogger,
        settings: settings({ preferences: prefs({ transportMode: mode }) }),
      });

      expect(places.last.radiusMeters).toBe(radiusMeters);
      // 検索中心が吉方位方向へ offsetKm 進んだ点になっている
      const expected = offsetPoint(HOME, bearingOf(good.direction), offsetKm);
      expect(places.last.point.lat).toBeCloseTo(expected.lat, 6);
      expect(places.last.point.lng).toBeCloseTo(expected.lng, 6);
    });
  }

  it("移動手段が未設定なら env 既定(PLACES_OFFSET_KM / PLACES_RADIUS_METERS)を使う", async () => {
    const good = primaryGoodDirection(DATE);
    const places = new RecordingPlacesProvider([{ name: "スポット" }]);

    await generateDailyForUser(user, DATE, {
      provider: new MockLlmProvider(),
      calendar,
      places,
      placesOffsetKm: 7,
      placesRadiusMeters: 999,
      logger: silentLogger,
      settings: settings({ preferences: prefs() }),
    });

    expect(places.last.radiusMeters).toBe(999);
    const expected = offsetPoint(HOME, bearingOf(good.direction), 7);
    expect(places.last.point.lat).toBeCloseTo(expected.lat, 6);
  });
});

describe("活動時間帯・休日曜日のプロンプト反映", () => {
  it("活動時間帯が指示に入る", async () => {
    const provider = new RecordingLlmProvider();
    await generateDailyForUser(user, DATE, {
      provider,
      calendar,
      logger: silentLogger,
      settings: settings({ preferences: prefs({ wakeTime: "06:30", sleepTime: "22:00" }) }),
    });
    expect(provider.last.system).toContain("06:30 起床・22:00 就寝");
    expect(provider.last.user).toContain("活動時間帯: 06:30〜22:00");
  });

  it("既定(土日)で土曜は休日・木曜は平日と判定される", async () => {
    const weekday = new RecordingLlmProvider();
    await generateDailyForUser(user, DATE, {
      provider: weekday,
      calendar,
      logger: silentLogger,
      settings: settings(),
    });
    expect(weekday.last.user).toContain("曜日区分: 平日");

    const holiday = new RecordingLlmProvider();
    await generateDailyForUser(user, SATURDAY, {
      provider: holiday,
      calendar,
      logger: silentLogger,
      settings: settings(),
    });
    expect(holiday.last.user).toContain("曜日区分: 休日");
  });

  it("休日曜日をカスタム設定すると平日/休日の判定が入れ替わる", async () => {
    // 木曜(2026-07-23)を休日に設定
    const thursdayOff = new RecordingLlmProvider();
    await generateDailyForUser(user, DATE, {
      provider: thursdayOff,
      calendar,
      logger: silentLogger,
      settings: settings({ preferences: prefs({ holidayWeekdays: [4] }) }),
    });
    expect(thursdayOff.last.user).toContain("曜日区分: 休日");

    // 土曜(2026-08-01)は休日から外れる
    const saturdayOn = new RecordingLlmProvider();
    await generateDailyForUser(user, SATURDAY, {
      provider: saturdayOn,
      calendar,
      logger: silentLogger,
      settings: settings({ preferences: prefs({ holidayWeekdays: [4] }) }),
    });
    expect(saturdayOn.last.user).toContain("曜日区分: 平日");
  });
});

describe("設定が全て未設定のとき従来挙動と同じ", () => {
  it("settings を渡さない場合と EMPTY 相当を渡した場合でプロンプト・出力が一致する", async () => {
    const places = () => new RecordingPlacesProvider([{ name: "みどり珈琲店" }]);

    const withoutSettings = new RecordingLlmProvider();
    const a = await generateDailyForUser(user, DATE, {
      provider: withoutSettings,
      calendar,
      places: places(),
      logger: silentLogger,
    });

    const withEmpty = new RecordingLlmProvider();
    const b = await generateDailyForUser(user, DATE, {
      provider: withEmpty,
      calendar,
      places: places(),
      logger: silentLogger,
      settings: settings(),
    });

    expect(withEmpty.last).toEqual(withoutSettings.last);
    expect(b.sections).toEqual(a.sections);
    expect(b.structured).toEqual(a.structured);
  });

  it("未設定でも Places 検索と生成が従来どおり成立する(距離は env 既定)", async () => {
    const good = primaryGoodDirection(DATE);
    const places = new RecordingPlacesProvider([{ name: "みどり珈琲店" }]);
    const provider = new RecordingLlmProvider();

    const gen = await generateDailyForUser(user, DATE, {
      provider,
      calendar,
      places,
      logger: silentLogger,
    });

    expect(gen.parsed).toBe(true);
    expect(provider.last.user).toContain("みどり珈琲店");
    // 既定の 3km / 1500m
    expect(places.last.radiusMeters).toBe(1500);
    const expected = offsetPoint(HOME, bearingOf(good.direction), 3);
    expect(places.last.point.lat).toBeCloseTo(expected.lat, 6);
    // 活動時間帯・移動手段の指示は付かない(従来と同じ指示文)
    expect(provider.last.system).not.toContain("活動時間帯");
    expect(provider.last.system).not.toContain("主な移動手段");
  });
});

describe("runDailyBatch: getSettings の注入", () => {
  it("ユーザーごとに設定を取得して生成へ渡す", async () => {
    const good = primaryGoodDirection(DATE);
    const provider = new RecordingLlmProvider();
    const asked: number[] = [];

    const result = await runDailyBatch(DATE, {
      provider,
      calendar,
      places: new RecordingPlacesProvider([{ name: "検索で出た店" }]),
      getUsers: () => [user],
      getSettings: (userId) => {
        asked.push(userId);
        return settings({
          favoritePlaces: [favoriteAt(1, "◯◯コワーキング", good.direction)],
          preferences: prefs({ transportMode: "walk" }),
        });
      },
      saveFortune: () => undefined,
      logger: silentLogger,
    });

    expect(result.succeeded).toBe(1);
    expect(asked).toEqual([user.userId]);
    expect(provider.last.user).toContain("◯◯コワーキング");
    expect(provider.last.user).toContain("移動手段: 徒歩");
  });

  it("設定取得が失敗しても既定挙動で生成を続行する(ユーザーをスキップしない)", async () => {
    const provider = new RecordingLlmProvider();
    const errors: string[] = [];

    const result = await runDailyBatch(DATE, {
      provider,
      calendar,
      places: new RecordingPlacesProvider([{ name: "みどり珈琲店" }]),
      getUsers: () => [user],
      getSettings: () => {
        throw new Error("db error");
      },
      saveFortune: () => undefined,
      logger: { info: () => undefined, error: (m) => errors.push(m) },
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toHaveLength(0);
    // 失敗は握りつぶさずログに残す(個人情報は出さず user_id のみ)
    expect(errors.some((e) => e.includes("設定取得に失敗"))).toBe(true);
    expect(errors.some((e) => e.includes(`user_id=${String(user.userId)}`))).toBe(true);
    expect(provider.last.user).toContain("みどり珈琲店");
  });

  it("getSettings を渡さなければ従来どおり動く", async () => {
    const result = await runDailyBatch(DATE, {
      provider: new MockLlmProvider(),
      calendar,
      getUsers: () => [user],
      saveFortune: () => undefined,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(1);
  });
});
