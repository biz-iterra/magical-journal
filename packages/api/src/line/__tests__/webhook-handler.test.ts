import { describe, expect, it, vi } from "vitest";
import type { LineClient, LineMessage } from "../client.js";
import type { LineConfig } from "../flex.js";
import {
  type LineWebhookEvent,
  type WebhookHandlerDeps,
  type WebhookQueries,
  handleWebhookEvents,
  resolveTextResponse,
} from "../webhook-handler.js";

const CONFIG: LineConfig = {
  liffId: "liff-id",
  publicAssetBaseUrl: "https://assets.test",
};

/** 応答を記録するフェイク LINE クライアント。 */
class FakeLineClient implements LineClient {
  readonly calls: { replyToken: string; messages: readonly LineMessage[] }[] = [];
  shouldFail = false;
  reply(replyToken: string, messages: readonly LineMessage[]): Promise<void> {
    if (this.shouldFail) return Promise.reject(new Error("boom"));
    this.calls.push({ replyToken, messages });
    return Promise.resolve();
  }
}

/** 登録済みユーザー(userId=1)を返すフェイククエリ。 */
function registeredQueries(overrides: Partial<WebhookQueries> = {}): WebhookQueries {
  return {
    getUserByLineId: (id) => (id === "U-registered" ? { id: 1 } : undefined),
    getProfile: (userId) => (userId === 1 ? { char_style: "male" } : undefined),
    getDiagResult: (userId, moduleId) => {
      if (userId !== 1) return undefined;
      if (moduleId === "potential") return { result_json: JSON.stringify({ primaryType: "IR+" }) };
      if (moduleId === "zodiac") return { result_json: JSON.stringify({ sign: "aries" }) };
      if (moduleId === "kigaku_profile")
        return { result_json: JSON.stringify({ honmeiStar: 1, getsumeiStar: 2 }) };
      return undefined;
    },
    getDailyFortune: (userId) => (userId === 1 ? { fortune_text: "今日は東が吉。" } : undefined),
    ...overrides,
  };
}

function makeDeps(
  client: LineClient,
  queries: WebhookQueries,
  today = "2026-07-23",
): WebhookHandlerDeps {
  return { lineClient: client, config: CONFIG, queries, todayJST: () => today };
}

describe("resolveTextResponse", () => {
  it("『マイタイプ』でタイプカードを返す", () => {
    const deps = makeDeps(new FakeLineClient(), registeredQueries());
    const res = resolveTextResponse("マイタイプ", "U-registered", deps);
    expect(res).not.toBeNull();
    const json = JSON.stringify(res);
    expect(json).toContain("flex");
    expect(json).toContain("マイペースな自信家"); // IR+ の typeName
    expect(json).toContain("牡羊座"); // aries
    expect(json).toContain("一白水星"); // honmeiStar 1
  });

  it("前後の空白があってもキーワード一致する", () => {
    const deps = makeDeps(new FakeLineClient(), registeredQueries());
    const res = resolveTextResponse("  マイタイプ  ", "U-registered", deps);
    expect(JSON.stringify(res)).toContain("マイペースな自信家");
  });

  it("『今日の運勢』で運勢カード(当日分)を返す", () => {
    const deps = makeDeps(new FakeLineClient(), registeredQueries());
    const res = resolveTextResponse("今日の運勢", "U-registered", deps);
    const json = JSON.stringify(res);
    expect(json).toContain("2026-07-23");
    expect(json).toContain("東が吉");
  });

  it("運勢未生成なら準備中カードを返す", () => {
    const deps = makeDeps(
      new FakeLineClient(),
      registeredQueries({ getDailyFortune: () => undefined }),
    );
    const res = resolveTextResponse("今日の運勢", "U-registered", deps);
    expect(JSON.stringify(res)).toContain("準備中");
  });

  it("未登録ユーザーは全テキストで登録案内を返す", () => {
    const deps = makeDeps(new FakeLineClient(), registeredQueries());
    for (const text of ["マイタイプ", "今日の運勢", "こんにちは"]) {
      const res = resolveTextResponse(text, "U-unknown", deps);
      const json = JSON.stringify(res);
      expect(json).toContain("登録");
      expect(json).not.toContain("flex");
    }
  });

  it("userId 無し(source なし)も未登録扱い", () => {
    const deps = makeDeps(new FakeLineClient(), registeredQueries());
    const res = resolveTextResponse("マイタイプ", undefined, deps);
    expect(JSON.stringify(res)).toContain("登録");
  });

  it("その他テキストはヘルプを返す", () => {
    const deps = makeDeps(new FakeLineClient(), registeredQueries());
    const res = resolveTextResponse("天気は?", "U-registered", deps);
    const json = JSON.stringify(res);
    expect(json).toContain("マイタイプ");
    expect(json).toContain("今日の運勢");
    expect(json).not.toContain("flex");
  });
});

describe("handleWebhookEvents", () => {
  it("テキストメッセージに reply する", async () => {
    const client = new FakeLineClient();
    const deps = makeDeps(client, registeredQueries());
    const events: LineWebhookEvent[] = [
      {
        type: "message",
        replyToken: "rt-1",
        source: { userId: "U-registered" },
        message: { type: "text", text: "マイタイプ" },
      },
    ];
    await handleWebhookEvents(events, deps);
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]?.replyToken).toBe("rt-1");
  });

  it("テキスト以外・replyToken 無しは無視する", async () => {
    const client = new FakeLineClient();
    const deps = makeDeps(client, registeredQueries());
    const events: LineWebhookEvent[] = [
      { type: "follow", replyToken: "rt", source: { userId: "U-registered" } },
      {
        type: "message",
        source: { userId: "U-registered" },
        message: { type: "image" },
      },
      {
        type: "message",
        // replyToken 無し
        source: { userId: "U-registered" },
        message: { type: "text", text: "マイタイプ" },
      },
    ];
    await handleWebhookEvents(events, deps);
    expect(client.calls).toHaveLength(0);
  });

  it("reply 失敗を握りつぶさずログに残し、次イベントを続行する", async () => {
    const client = new FakeLineClient();
    client.shouldFail = true;
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = makeDeps(client, registeredQueries());
    const events: LineWebhookEvent[] = [
      {
        type: "message",
        replyToken: "rt-1",
        source: { userId: "U-registered" },
        message: { type: "text", text: "マイタイプ" },
      },
    ];
    await expect(handleWebhookEvents(events, deps)).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    // ログに個人情報(userId)を含めない
    const logged = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).not.toContain("U-registered");
    errSpy.mockRestore();
  });
});
