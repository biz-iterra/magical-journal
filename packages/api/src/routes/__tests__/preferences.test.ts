/**
 * /api/preferences(「今日のジャーナル」設定)と /api/preferences/places(よく行く場所)の
 * 入力検証・件数上限・本人スコープのテスト。
 *
 * 注: better-sqlite3 のネイティブバインディングが無いローカル環境では
 * initMemoryDb() が "Could not locate the bindings file" で失敗する(既知の制約)。
 * Docker / CI ではバインディングが揃うため実行される。
 */

import { beforeEach, describe, expect, it } from "vitest";

process.env.NODE_ENV = "development";
process.env.DATABASE_PATH = ":memory:";
process.env.LLM_PROVIDER = "mock";

import app from "../../app.js";
import { initMemoryDb } from "../../db/connection.js";
import { createProfile, createUser } from "../../db/queries.js";
import { initDb } from "../../db/schema.js";

const LINE_ID = "U-prefs";
const AUTH = { Authorization: `Bearer dev:${LINE_ID}` };

function seedUser(): number {
  const u = createUser(LINE_ID, null, true);
  createProfile(u.id, {
    birthDate: "1990-05-17",
    nameKana: "テスト",
    nameRomaji: "TEST",
    charStyle: "male",
    lat: 35.6812,
    lng: 139.7671,
  });
  return u.id;
}

function get(): Promise<Response> {
  return Promise.resolve(
    app.fetch(new Request("http://localhost/api/preferences", { headers: AUTH })),
  );
}

function patch(body: unknown): Promise<Response> {
  return Promise.resolve(
    app.fetch(
      new Request("http://localhost/api/preferences", {
        method: "PATCH",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

function addPlace(body: unknown): Promise<Response> {
  return Promise.resolve(
    app.fetch(
      new Request("http://localhost/api/preferences/places", {
        method: "POST",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

function deletePlace(id: number | string): Promise<Response> {
  return Promise.resolve(
    app.fetch(
      new Request(`http://localhost/api/preferences/places/${String(id)}`, {
        method: "DELETE",
        headers: AUTH,
      }),
    ),
  );
}

const validPlace = {
  name: "◯◯コワーキング",
  addressText: "東京都千代田区丸の内1-1-1",
  lat: 35.69,
  lng: 139.77,
  category: "コワーキング",
};

interface PreferencesBody {
  preferences: {
    wakeTime: string | null;
    sleepTime: string | null;
    transportMode: string | null;
    holidayWeekdays: number[] | null;
    effectiveHolidayWeekdays: number[];
  };
  places: { id: number; name: string; category: string | null; addressText: string }[];
  limits: { places: number };
}

describe("GET /api/preferences", () => {
  beforeEach(() => {
    initDb(initMemoryDb());
  });

  it("未設定なら全 null + 既定の休日曜日(土日)+ 上限を返す", async () => {
    seedUser();
    const res = await get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as PreferencesBody;
    expect(body.preferences.wakeTime).toBeNull();
    expect(body.preferences.sleepTime).toBeNull();
    expect(body.preferences.transportMode).toBeNull();
    expect(body.preferences.holidayWeekdays).toBeNull();
    expect(body.preferences.effectiveHolidayWeekdays).toEqual([0, 6]);
    expect(body.places).toEqual([]);
    expect(body.limits.places).toBe(10);
  });

  it("未登録ユーザーは MJ-USER-404", async () => {
    const res = await get();
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe("MJ-USER-404");
  });
});

describe("PATCH /api/preferences", () => {
  beforeEach(() => {
    initDb(initMemoryDb());
    seedUser();
  });

  it("設定を保存し、GET で読み戻せる", async () => {
    const res = await patch({
      wakeTime: "06:30",
      sleepTime: "22:00",
      transportMode: "train",
      holidayWeekdays: [3, 4],
    });
    expect(res.status).toBe(200);

    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.preferences.wakeTime).toBe("06:30");
    expect(body.preferences.sleepTime).toBe("22:00");
    expect(body.preferences.transportMode).toBe("train");
    expect(body.preferences.holidayWeekdays).toEqual([3, 4]);
    expect(body.preferences.effectiveHolidayWeekdays).toEqual([3, 4]);
  });

  it("部分更新(キー未指定は変更しない)", async () => {
    await patch({ wakeTime: "06:30", transportMode: "car" });
    await patch({ wakeTime: "07:00" });
    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.preferences.wakeTime).toBe("07:00");
    expect(body.preferences.transportMode).toBe("car");
  });

  it("null を渡すと未設定へ戻る", async () => {
    await patch({ wakeTime: "06:30", transportMode: "car", holidayWeekdays: [1] });
    await patch({ wakeTime: null, transportMode: null, holidayWeekdays: null });
    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.preferences.wakeTime).toBeNull();
    expect(body.preferences.transportMode).toBeNull();
    expect(body.preferences.holidayWeekdays).toBeNull();
    expect(body.preferences.effectiveHolidayWeekdays).toEqual([0, 6]);
  });

  it("休日なし(空配列)を明示設定できる", async () => {
    await patch({ holidayWeekdays: [] });
    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.preferences.holidayWeekdays).toEqual([]);
    expect(body.preferences.effectiveHolidayWeekdays).toEqual([]);
  });

  it("時刻の形式不正は MJ-PREF-001", async () => {
    for (const bad of [{ wakeTime: "6:30" }, { wakeTime: "24:00" }, { sleepTime: "22-00" }]) {
      const res = await patch(bad);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("MJ-PREF-001");
    }
  });

  it("移動手段の不正は MJ-PREF-002", async () => {
    const res = await patch({ transportMode: "plane" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("MJ-PREF-002");
  });

  it("休日曜日の不正は MJ-PREF-003", async () => {
    for (const bad of [{ holidayWeekdays: [7] }, { holidayWeekdays: [0, 0] }]) {
      const res = await patch(bad);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("MJ-PREF-003");
    }
  });
});

describe("POST /api/preferences/places", () => {
  beforeEach(() => {
    initDb(initMemoryDb());
    seedUser();
  });

  it("追加すると 201 で作成した地点を返し、GET の一覧に載る", async () => {
    const res = await addPlace(validPlace);
    expect(res.status).toBe(201);
    const created = (await res.json()) as { place: { id: number; name: string } };
    expect(created.place.name).toBe("◯◯コワーキング");

    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.places).toHaveLength(1);
    expect(body.places[0]?.addressText).toBe(validPlace.addressText);
  });

  it("カテゴリは任意(未指定なら null)", async () => {
    const res = await addPlace({ ...validPlace, category: undefined });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { place: { category: string | null } };
    expect(created.place.category).toBeNull();
  });

  it("名前・住所が無ければ MJ-PREF-004", async () => {
    for (const bad of [
      { ...validPlace, name: "" },
      { ...validPlace, name: "   " },
      { ...validPlace, addressText: "" },
    ]) {
      const res = await addPlace(bad);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("MJ-PREF-004");
    }
  });

  it("座標が範囲外・数値でなければ MJ-PREF-005", async () => {
    for (const bad of [
      { ...validPlace, lat: 91 },
      { ...validPlace, lat: -91 },
      { ...validPlace, lng: 181 },
      { ...validPlace, lng: -181 },
      { ...validPlace, lat: "35.6" },
      { ...validPlace, lng: Number.NaN },
    ]) {
      const res = await addPlace(bad);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("MJ-PREF-005");
    }
  });

  it("上限 10 件を超えると MJ-PREF-409", async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await addPlace({ ...validPlace, name: `地点${String(i)}` });
      expect(res.status).toBe(201);
    }
    const over = await addPlace({ ...validPlace, name: "11件目" });
    expect(over.status).toBe(409);
    expect(((await over.json()) as { code: string }).code).toBe("MJ-PREF-409");
  });
});

describe("DELETE /api/preferences/places/:id", () => {
  beforeEach(() => {
    initDb(initMemoryDb());
    seedUser();
  });

  it("削除すると一覧から消える", async () => {
    const created = (await addPlace(validPlace).then((r) => r.json())) as { place: { id: number } };
    const res = await deletePlace(created.place.id);
    expect(res.status).toBe(200);
    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.places).toEqual([]);
  });

  it("存在しない ID / 不正な ID は MJ-PREF-404", async () => {
    for (const id of [9999, "abc", 0]) {
      const res = await deletePlace(id);
      expect(res.status).toBe(404);
      expect(((await res.json()) as { code: string }).code).toBe("MJ-PREF-404");
    }
  });

  it("他人の地点は削除できない(本人スコープ)", async () => {
    const created = (await addPlace(validPlace).then((r) => r.json())) as { place: { id: number } };

    // 別ユーザーのセッションで同じ ID を削除しようとする
    const other = createUser("U-other", null, true);
    createProfile(other.id, {
      birthDate: "1988-03-01",
      nameKana: "ホカ",
      nameRomaji: "HOKA",
      charStyle: "female",
    });
    const res = await app.fetch(
      new Request(`http://localhost/api/preferences/places/${String(created.place.id)}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer dev:U-other" },
      }),
    );
    expect(res.status).toBe(404);

    // 本人の一覧には残っている
    const body = (await get().then((r) => r.json())) as PreferencesBody;
    expect(body.places).toHaveLength(1);
  });
});
