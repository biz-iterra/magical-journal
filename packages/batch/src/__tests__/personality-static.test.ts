/**
 * 性質レポート 144 通りの事前生成ロジックのテスト。
 *
 * - 12 タイプ × 12 星座 = 144 件を取りこぼしなく列挙する
 * - ファイル名に "+" / "-" 記号をそのまま使わない(slug 規則)
 * - 既存ファイルはスキップ(中断・再開)、--force で上書き
 * - dry-run では LLM を呼ばず書き出しもしない
 * - 失敗は握りつぶさず一覧に残し、他の組み合わせは続行する
 */

import { CHARACTER_MAP, ZODIAC_SIGNS, personalityStaticFileName } from "@mj/engine";
import { describe, expect, it, vi } from "vitest";
import { MockLlmProvider } from "../llm/mock.js";
import type { LlmProvider } from "../llm/provider.js";
import {
  generatePersonalityStaticReports,
  listPersonalityStaticTargets,
  serializeStaticReport,
} from "../personality/static.js";
import { personalityStructuredOf } from "../personality/structured.js";

const silentLogger = { info: () => undefined, error: () => undefined };

describe("personalityStructuredOf", () => {
  it("タイプ×星座から engine の一次情報で表示名を組み立てる", () => {
    const s = personalityStructuredOf("IR-", "taurus");
    expect(s.potentialType).toBe("IR-");
    // docs/04 調整後のタイプ名(engine の CHARACTER_MAP が正)
    expect(s.typeName).toBe(CHARACTER_MAP.get("IR-")?.typeName);
    expect(s.zodiac).toBe("taurus");
    expect(s.zodiacName).toBe("牡牛座");
  });
});

describe("listPersonalityStaticTargets", () => {
  const targets = listPersonalityStaticTargets();

  it("144 件(12 タイプ × 12 星座)を列挙する", () => {
    expect(targets).toHaveLength(144);
  });

  it("12 タイプ・12 星座を取りこぼさない", () => {
    expect(new Set(targets.map((t) => t.potentialType)).size).toBe(12);
    expect(new Set(targets.map((t) => t.zodiac)).size).toBe(12);
    for (const typeId of CHARACTER_MAP.keys()) {
      expect(targets.filter((t) => t.potentialType === typeId)).toHaveLength(12);
    }
    for (const zodiac of ZODIAC_SIGNS) {
      expect(targets.filter((t) => t.zodiac === zodiac)).toHaveLength(12);
    }
  });

  it("ファイル名は一意で、記号(+/-)をそのまま含まない", () => {
    const names = targets.map((t) => t.fileName);
    expect(new Set(names).size).toBe(144);
    for (const name of names) {
      expect(name).toMatch(/^[a-z]{2}-(plus|minus)-[a-z]+\.json$/);
      expect(name).not.toContain("+");
    }
    expect(names).toContain(personalityStaticFileName("ER+", "aries"));
    expect(names).toContain("er-plus-aries.json");
  });
});

describe("generatePersonalityStaticReports", () => {
  it("dry-run では LLM を呼ばず、書き出しもしない", async () => {
    const generate = vi.fn();
    const provider = { name: "spy", generate } as unknown as LlmProvider;
    const write = vi.fn();

    const result = await generatePersonalityStaticReports({
      provider,
      exists: () => false,
      write,
      dryRun: true,
      logger: silentLogger,
    });

    expect(generate).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(result.total).toBe(144);
    expect(result.targeted).toBe(144);
    expect(result.planned).toBe(144);
    expect(result.generated).toBe(0);
    expect(result.failed).toHaveLength(0);
  });

  it("既存ファイルはスキップし、未生成分だけ生成する(中断・再開)", async () => {
    const existing = new Set(["er-plus-aries.json"]);
    const written = new Map<string, string>();

    const result = await generatePersonalityStaticReports({
      provider: new MockLlmProvider(),
      exists: (f) => existing.has(f),
      write: (f, c) => {
        written.set(f, c);
      },
      limit: 3,
      logger: silentLogger,
    });

    expect(result.targeted).toBe(3);
    expect(result.skipped + result.generated).toBe(3);
    expect(written.has("er-plus-aries.json")).toBe(false);
  });

  it("--force は既存ファイルも上書きする", async () => {
    const written: string[] = [];
    const result = await generatePersonalityStaticReports({
      provider: new MockLlmProvider(),
      exists: () => true,
      write: (f) => {
        written.push(f);
      },
      force: true,
      limit: 2,
      logger: silentLogger,
    });

    expect(result.skipped).toBe(0);
    expect(result.generated).toBe(2);
    expect(written).toHaveLength(2);
  });

  it("生成される JSON は API の report と同形状(axes を含まない)", async () => {
    const written = new Map<string, string>();
    await generatePersonalityStaticReports({
      provider: new MockLlmProvider(),
      exists: () => false,
      write: (f, c) => {
        written.set(f, c);
      },
      limit: 1,
      logger: silentLogger,
    });

    const [fileName, content] = [...written.entries()][0] ?? [];
    expect(fileName).toBeDefined();
    const parsed = JSON.parse(content ?? "{}") as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual([
      "items",
      "potentialType",
      "typeName",
      "zodiac",
      "zodiacName",
    ]);
    const items = parsed.items as Record<string, string>;
    expect(Object.keys(items).sort()).toEqual([
      "badAt",
      "basicNature",
      "goodAt",
      "socialTendency",
      "workStrength",
      "workWeakness",
    ]);
    expect(JSON.stringify(parsed)).not.toContain("axes");
  });

  it("1 件失敗しても続行し、失敗一覧を残す", async () => {
    let call = 0;
    const provider: LlmProvider = {
      name: "flaky",
      generate: () => {
        call += 1;
        if (call === 2) return Promise.reject(new Error("boom"));
        return new MockLlmProvider().generate({
          system: "",
          user: "RESPONSE_SCHEMA: personality\nタイプ名: X\n星座: Y",
        });
      },
    };

    const result = await generatePersonalityStaticReports({
      provider,
      exists: () => false,
      write: () => undefined,
      limit: 3,
      logger: silentLogger,
    });

    expect(result.generated).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain("boom");
  });

  it("JSON パース失敗は保存せず失敗扱いにする", async () => {
    const provider: LlmProvider = {
      name: "broken",
      generate: () => Promise.resolve("これは JSON ではありません"),
    };
    const write = vi.fn();

    const result = await generatePersonalityStaticReports({
      provider,
      exists: () => false,
      write,
      limit: 2,
      logger: silentLogger,
    });

    expect(write).not.toHaveBeenCalled();
    expect(result.generated).toBe(0);
    expect(result.failed).toHaveLength(2);
  });
});

describe("serializeStaticReport", () => {
  it("整形済み JSON + 末尾改行で書き出す", () => {
    const content = serializeStaticReport({
      potentialType: "ER+",
      typeName: "t",
      zodiac: "aries",
      zodiacName: "牡羊座",
      items: {
        basicNature: "a",
        workStrength: "b",
        workWeakness: "c",
        socialTendency: "d",
        goodAt: "e",
        badAt: "f",
      },
    });
    expect(content.endsWith("\n")).toBe(true);
    expect(content).toContain('\n  "typeName": "t"');
  });
});
