import { describe, expect, it } from "vitest";
import type { ResolvedSchedulePreferences } from "../daily/preferences.js";
import { buildDailyPrompt } from "../daily/prompt.js";
import type { ScheduleMaterial } from "../daily/prompt.js";
import type { DailyStructured } from "../daily/structured.js";
import type { Persona } from "../data/personas.js";

const generalMaterial: ScheduleMaterial = { places: [], method: "general" };
const placesMaterial: ScheduleMaterial = {
  places: [{ name: "みどり珈琲店", vicinity: "北公園駅前", category: "カフェ" }],
  method: "places",
};
const favoriteMaterial: ScheduleMaterial = {
  places: [{ name: "◯◯コワーキング", category: "コワーキング" }],
  method: "favorite",
};

/** 解決済みユーザー設定(未指定は未設定 = null) */
function resolved(partial: Partial<ResolvedSchedulePreferences> = {}): ResolvedSchedulePreferences {
  return {
    wakeTime: null,
    sleepTime: null,
    transportMode: null,
    isHoliday: false,
    ...partial,
  };
}

const structured: DailyStructured = {
  date: "2026-07-23",
  honmeiStar: 1,
  honmeiStarName: "一白水星",
  getsumeiStar: 6,
  getsumeiStarName: "六白金星",
  dayCenterStar: 5,
  dayCenterStarName: "五黄土星",
  potentialType: "IL+",
  typeName: "個性的な理論派",
  goodDirections: [
    { direction: "N", label: "北", star: 3, starName: "三碧木星", level: "最大吉方" },
  ],
  badDirections: [
    { direction: "S", label: "南", star: 5, starName: "五黄土星", misfortunes: ["五黄殺"] },
  ],
};

const persona: Persona = {
  typeId: "IL+",
  typeName: "個性的な理論派",
  style: "male",
  name: "カゼマ",
  pronoun: "俺",
  tone: "クールで理屈っぽい",
  speechExamples: ["論理的に言えば、こうだ"],
  catchphrase: "理論こそすべて",
  personalityCore: ["理論派", "個性的"],
};

describe("buildDailyPrompt", () => {
  it("persona のトーンを system に注入する(characterNote 用)", () => {
    const { system } = buildDailyPrompt(structured, persona, generalMaterial);
    expect(system).toContain("カゼマ");
    expect(system).toContain("俺");
    expect(system).toContain("クールで理屈っぽい");
    expect(system).toContain("論理的に言えば、こうだ");
  });

  it("system に3セクションの出力ルールと JSON 指示を含む", () => {
    const { system } = buildDailyPrompt(structured, persona, generalMaterial);
    expect(system).toContain("fortune");
    expect(system).toContain("schedule");
    expect(system).toContain("characterNote");
    // schedule では気学用語を使わない旨の指示がある
    expect(system).toContain("占い用語");
  });

  it("user に構造化データをラベル形式で載せる(Mock が解釈可能)", () => {
    const { user } = buildDailyPrompt(structured, persona, generalMaterial);
    expect(user).toContain("RESPONSE_SCHEMA: daily_sections");
    expect(user).toContain("日付: 2026-07-23");
    expect(user).toContain("タイプ名: 個性的な理論派");
    expect(user).toContain("キャラ名: カゼマ");
    expect(user).toContain("本命星: 一白水星");
    expect(user).toContain("最大吉方=北(三碧木星)");
    expect(user).toContain("南(五黄殺)");
  });

  it("実在スポットが与えられれば user に店名を材料として載せる", () => {
    const { user } = buildDailyPrompt(structured, persona, placesMaterial);
    expect(user).toContain("みどり珈琲店");
  });

  it("スポットが無ければ一般提案の指示になる(実在店名なし)", () => {
    const { user } = buildDailyPrompt(structured, persona, generalMaterial);
    expect(user).toContain("スケジュール用スポット: なし");
  });

  it("persona 無しでも中立ボイスにフォールバックする", () => {
    const { system, user } = buildDailyPrompt(structured, undefined, generalMaterial);
    expect(system).toContain("ナビゲーター");
    expect(user).toContain("キャラ名: ナビ");
  });

  it("★著作権ガード: プロンプトに axes(3軸)語彙を注入しない", () => {
    const { system, user } = buildDailyPrompt(structured, persona, placesMaterial);
    for (const axisWord of ["axes", "頭脳", "右脳", "左脳", "perspective"]) {
      expect(system).not.toContain(axisWord);
      expect(user).not.toContain(axisWord);
    }
  });
});

describe("buildDailyPrompt: ユーザー設定の反映", () => {
  it("設定を渡さなければ従来のプロンプトと完全に一致する(後方互換)", () => {
    const before = buildDailyPrompt(structured, persona, placesMaterial);
    expect(before.system).not.toContain("このユーザーの設定");
    expect(before.system).not.toContain("活動時間帯");
    expect(before.system).not.toContain("移動手段");
    expect(before.user).not.toContain("活動時間帯");
    expect(before.user).not.toContain("曜日区分");
    expect(before.user).not.toContain("移動手段");
  });

  it("活動時間帯(起床・就寝)を system と user に反映する", () => {
    const { system, user } = buildDailyPrompt(
      structured,
      persona,
      placesMaterial,
      resolved({ wakeTime: "06:30", sleepTime: "22:00" }),
    );
    expect(system).toContain("06:30 起床・22:00 就寝");
    expect(system).toContain("この範囲外の時刻を書かないでください");
    expect(user).toContain("活動時間帯: 06:30〜22:00");
  });

  it("起床のみ・就寝のみでも指示できる", () => {
    const wakeOnly = buildDailyPrompt(
      structured,
      persona,
      placesMaterial,
      resolved({ wakeTime: "05:00" }),
    );
    expect(wakeOnly.system).toContain("起床は 05:00 です");
    expect(wakeOnly.user).toContain("活動時間帯: 05:00 起床(就寝時刻の指定なし)");

    const sleepOnly = buildDailyPrompt(
      structured,
      persona,
      placesMaterial,
      resolved({ sleepTime: "23:30" }),
    );
    expect(sleepOnly.system).toContain("就寝は 23:30 です");
    expect(sleepOnly.user).toContain("活動時間帯: 23:30 就寝(起床時刻の指定なし)");
  });

  it("平日は仕事中心・休日は過ごし方中心の指示になる", () => {
    const weekday = buildDailyPrompt(structured, persona, placesMaterial, resolved());
    expect(weekday.system).toContain("平日です");
    expect(weekday.system).toContain("仕事・作業の時間を軸");
    expect(weekday.user).toContain("曜日区分: 平日");

    const holiday = buildDailyPrompt(
      structured,
      persona,
      placesMaterial,
      resolved({ isHoliday: true }),
    );
    expect(holiday.system).toContain("休日です");
    expect(holiday.system).toContain("過ごし方");
    expect(holiday.user).toContain("曜日区分: 休日");
  });

  it("移動手段を日本語ラベルで指示する", () => {
    const { system, user } = buildDailyPrompt(
      structured,
      persona,
      placesMaterial,
      resolved({ transportMode: "walk" }),
    );
    expect(system).toContain("主な移動手段は徒歩です");
    expect(user).toContain("移動手段: 徒歩");
  });

  it("登録地点(favorite)は名前をそのまま使わせる指示が入る", () => {
    const { system, user } = buildDailyPrompt(
      structured,
      persona,
      favoriteMaterial,
      resolved({ isHoliday: true }),
    );
    expect(user).toContain("◯◯コワーキング");
    expect(user).toContain("※ユーザーが登録した場所(名前をそのまま使う)");
    expect(system).toContain("ユーザー自身が登録した場所");
    expect(system).toContain("一字も変えず");
  });

  it("Places 由来のスポットには「登録した場所」の指示を付けない", () => {
    const { system } = buildDailyPrompt(structured, persona, placesMaterial, resolved());
    expect(system).not.toContain("ユーザー自身が登録した場所");
  });

  it("★個人情報ガード: 設定を反映しても住所・座標はプロンプトに載らない", () => {
    const { system, user } = buildDailyPrompt(
      structured,
      persona,
      favoriteMaterial,
      resolved({ wakeTime: "06:30", sleepTime: "22:00", transportMode: "car", isHoliday: true }),
    );
    // ScheduleMaterial は名前・カテゴリのみを持つ設計なので、緯度経度らしい数値列が出ない
    for (const text of [system, user]) {
      expect(text).not.toContain("35.6");
      expect(text).not.toContain("139.7");
      expect(text).not.toContain("lat");
      expect(text).not.toContain("lng");
      expect(text).not.toContain("丁目");
    }
  });
});
