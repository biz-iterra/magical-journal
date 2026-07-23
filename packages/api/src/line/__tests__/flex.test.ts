import { describe, expect, it } from "vitest";
import {
  type LineConfig,
  buildFortuneCard,
  buildHelp,
  buildMyTypeCard,
  buildRegisterPrompt,
  characterImageUrl,
  liffDeepLink,
  summarize,
} from "../flex.js";

const CONFIG: LineConfig = {
  liffId: "1234567890-abcdef",
  publicAssetBaseUrl: "https://assets.example.test",
};

const NO_URL_CONFIG: LineConfig = { liffId: "", publicAssetBaseUrl: "" };

/** JSON を再帰的に走査して文字列化(混入チェック用)。 */
function flatten(obj: unknown): string {
  return JSON.stringify(obj);
}

describe("URL ヘルパー", () => {
  it("characterImageUrl は directoryKey 規則で URL を作る", () => {
    // IL+ -> characters/03-kazema/
    expect(characterImageUrl(CONFIG, "IL+", "male")).toBe(
      "https://assets.example.test/characters/03-kazema/male.webp",
    );
    expect(characterImageUrl(CONFIG, "IL+", "female")).toBe(
      "https://assets.example.test/characters/03-kazema/female.webp",
    );
  });

  it("ベース URL 未設定なら null(画像省略)", () => {
    expect(characterImageUrl(NO_URL_CONFIG, "IL+", "male")).toBeNull();
  });

  it("liffDeepLink は https://liff.line.me/{id}{path}", () => {
    expect(liffDeepLink(CONFIG, "/mytype")).toBe("https://liff.line.me/1234567890-abcdef/mytype");
    expect(liffDeepLink(CONFIG, "mytype")).toBe("https://liff.line.me/1234567890-abcdef/mytype");
    expect(liffDeepLink(CONFIG, "/")).toBe("https://liff.line.me/1234567890-abcdef/");
  });

  it("LIFF ID 未設定なら null(ボタン省略)", () => {
    expect(liffDeepLink(NO_URL_CONFIG, "/mytype")).toBeNull();
  });
});

describe("summarize", () => {
  it("max 以下はそのまま", () => {
    expect(summarize("短い文", 80)).toBe("短い文");
  });
  it("超過分は … で丸める", () => {
    const long = "あ".repeat(100);
    const out = summarize(long, 80);
    expect(out.length).toBe(81); // 80 文字 + …
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildMyTypeCard", () => {
  it("タイプ名・キャラ名・星座・本命星・LIFF リンク・画像を含む", () => {
    const msg = buildMyTypeCard(CONFIG, {
      typeId: "IR-", // typeName: 静かに核心を突く発想家 / male: ツクモ
      charStyle: "male",
      zodiacSign: "leo",
      honmeiStar: 3,
    });
    expect(msg.type).toBe("flex");
    const json = flatten(msg);
    expect(json).toContain("静かに核心を突く発想家"); // docs/04 適用済み typeName
    expect(json).toContain("ツクモ");
    expect(json).toContain("獅子座");
    expect(json).toContain("三碧木星");
    // LIFF リンク(/mytype)
    expect(json).toContain("https://liff.line.me/1234567890-abcdef/mytype");
    expect(json).toContain("詳しく見る");
    // 画像
    expect(json).toContain("characters/02-tsukuyo/male.webp");
  });

  it("axes・内部軸情報を含めない", () => {
    const msg = buildMyTypeCard(CONFIG, {
      typeId: "IR-",
      charStyle: "female",
      zodiacSign: "leo",
      honmeiStar: 3,
    });
    const json = flatten(msg);
    expect(json).not.toContain("axes");
    expect(json).not.toContain("rawValue");
    expect(json).not.toContain("secondaryType");
    // altText は必須
    expect((msg as { altText: string }).altText.length).toBeGreaterThan(0);
  });

  it("画像・リンク未設定でも Flex を返す(hero/footer 省略)", () => {
    const msg = buildMyTypeCard(NO_URL_CONFIG, {
      typeId: "IR+",
      charStyle: "male",
    });
    const bubble = (msg as { contents: Record<string, unknown> }).contents;
    expect(bubble.hero).toBeUndefined();
    expect(bubble.footer).toBeUndefined();
    expect(bubble.body).toBeDefined();
  });
});

describe("buildFortuneCard", () => {
  it("運勢文(要約)と今日のページ LIFF リンクを含む", () => {
    const msg = buildFortuneCard(CONFIG, {
      date: "2026-07-23",
      fortuneText: "今日は北が吉方位です。新しいことを始めるのに良い一日。",
    });
    const json = flatten(msg);
    expect(json).toContain("2026-07-23");
    expect(json).toContain("北が吉方位");
    expect(json).toContain("https://liff.line.me/1234567890-abcdef/");
    expect(json).toContain("今日のジャーナルを開く");
  });

  it("未生成(null)なら準備中コピー・リアルタイム生成しない", () => {
    const msg = buildFortuneCard(CONFIG, { date: "2026-07-23", fortuneText: null });
    const json = flatten(msg);
    expect(json).toContain("準備中");
  });
});

describe("テキスト応答", () => {
  it("buildRegisterPrompt は登録用リンクを含む", () => {
    const json = flatten(buildRegisterPrompt(CONFIG));
    expect(json).toContain("https://liff.line.me/1234567890-abcdef/");
    expect(json).toContain("登録");
  });

  it("LIFF 未設定でも登録案内テキストを返す", () => {
    const msg = buildRegisterPrompt(NO_URL_CONFIG);
    expect(msg.type).toBe("text");
    expect((msg as { text: string }).text.length).toBeGreaterThan(0);
  });

  it("buildHelp はキーワード案内を含む", () => {
    const json = flatten(buildHelp());
    expect(json).toContain("マイタイプ");
    expect(json).toContain("今日の運勢");
  });
});
