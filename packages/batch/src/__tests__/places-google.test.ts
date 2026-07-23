import { describe, expect, it, vi } from "vitest";
import { GooglePlacesProvider } from "../places/google.js";
import { NullPlacesProvider } from "../places/provider.js";

/** fetch のモックを作る(OK レスポンス) */
function mockFetchOk(body: unknown): typeof fetch {
  return vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response),
  ) as unknown as typeof fetch;
}

const query = { point: { lat: 35.68, lng: 139.76 }, radiusMeters: 1500 };

describe("NullPlacesProvider", () => {
  it("常に空配列を返す(キー未設定のフォールバック)", async () => {
    const p = new NullPlacesProvider();
    expect(await p.findNearby(query)).toEqual([]);
    expect(p.name).toBe("null");
  });
});

describe("GooglePlacesProvider", () => {
  it("キー未設定ならコンストラクタで分かりやすくエラー", () => {
    expect(() => new GooglePlacesProvider({ apiKey: "" })).toThrow(/GOOGLE_PLACES_API_KEY/);
  });

  it("OK レスポンスをスポット候補にマップする(name/vicinity/category)", async () => {
    const fetchImpl = mockFetchOk({
      status: "OK",
      results: [
        { name: "みどり珈琲店", vicinity: "北区みどり1-2", types: ["cafe", "food"] },
        { name: "中央公園", vicinity: "北区中央3", types: ["park"] },
      ],
    });
    const p = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });
    const results = await p.findNearby(query);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: "みどり珈琲店",
      vicinity: "北区みどり1-2",
      category: "カフェ",
    });
    expect(results[1]?.category).toBe("公園");
  });

  it("ZERO_RESULTS は空配列(正常系)", async () => {
    const fetchImpl = mockFetchOk({ status: "ZERO_RESULTS", results: [] });
    const p = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });
    expect(await p.findNearby(query)).toEqual([]);
  });

  it("非 OK ステータスは例外(呼び出し側がフォールバック判断する)", async () => {
    const fetchImpl = mockFetchOk({ status: "REQUEST_DENIED", error_message: "denied" });
    const p = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });
    await expect(p.findNearby(query)).rejects.toThrow(/REQUEST_DENIED/);
  });

  it("HTTP エラーは例外", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response),
    ) as unknown as typeof fetch;
    const p = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });
    await expect(p.findNearby(query)).rejects.toThrow(/HTTP 500/);
  });

  it("キーは URL に付くがエラーメッセージには含めない", async () => {
    const fetchImpl = mockFetchOk({ status: "OK", results: [] });
    const p = new GooglePlacesProvider({ apiKey: "secret-key-123", fetchImpl });
    await p.findNearby(query);
    const spy = fetchImpl as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = String(spy.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("key=secret-key-123");
    expect(calledUrl).toContain("language=ja");
  });
});
