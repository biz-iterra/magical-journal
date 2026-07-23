import { describe, expect, it, vi } from "vitest";
import type { ActiveUser } from "../daily/run.js";
import { MockLlmProvider } from "../llm/mock.js";
import { buildPersonalityPrompt } from "../personality/prompt.js";
import { buildReport, parsePersonalityItems } from "../personality/report.js";
import { generatePersonalityForUser, runPersonalityBatch } from "../personality/run.js";
import { buildPersonalityStructured, signatureOf } from "../personality/structured.js";

const silentLogger = { info: () => undefined, error: () => undefined };
const provider = new MockLlmProvider();

function user(userId: number, birthDate: string, birthTime: string | null = null): ActiveUser {
  return { userId, birthDate, birthTime, charStyle: "male", lat: null, lng: null };
}

describe("buildPersonalityStructured", () => {
  it("タイプ名(docs/04 適用済み)と星座を算出する", () => {
    // 1990-05-17 → 牡牛座
    const s = buildPersonalityStructured({ birthDate: "1990-05-17", birthTime: null });
    expect(s.zodiac).toBe("taurus");
    expect(s.zodiacName).toBe("牡牛座");
    expect(typeof s.typeName).toBe("string");
    expect(s.typeName.length).toBeGreaterThan(0);
    expect(signatureOf(s)).toBe(`${s.potentialType}:${s.zodiac}`);
  });
});

describe("buildPersonalityPrompt", () => {
  it("★著作権ガード: axes(3軸)語彙を注入しない", () => {
    const s = buildPersonalityStructured({ birthDate: "1990-05-17", birthTime: null });
    const { system, user: u } = buildPersonalityPrompt(s);
    for (const axisWord of ["axes", "頭脳", "右脳", "左脳", "perspective"]) {
      expect(system).not.toContain(axisWord);
      expect(u).not.toContain(axisWord);
    }
    expect(u).toContain("RESPONSE_SCHEMA: personality");
    expect(u).toContain(`星座: ${s.zodiacName}`);
  });
});

describe("parsePersonalityItems", () => {
  it("6項目 JSON をパースする", () => {
    const raw = JSON.stringify({
      basicNature: "a",
      workStrength: "b",
      workWeakness: "c",
      socialTendency: "d",
      goodAt: "e",
      badAt: "f",
    });
    const items = parsePersonalityItems(raw);
    expect(items?.basicNature).toBe("a");
    expect(items?.badAt).toBe("f");
  });

  it("全項目空/非 JSON は null", () => {
    expect(parsePersonalityItems("ただの文章")).toBeNull();
    expect(parsePersonalityItems('{"basicNature":""}')).toBeNull();
  });

  it("buildReport は生成根拠(タイプ・星座)を含み axes を含まない", () => {
    const s = buildPersonalityStructured({ birthDate: "1990-05-17", birthTime: null });
    const items = parsePersonalityItems(
      JSON.stringify({
        basicNature: "a",
        workStrength: "b",
        workWeakness: "c",
        socialTendency: "d",
        goodAt: "e",
        badAt: "f",
      }),
    );
    expect(items).not.toBeNull();
    if (!items) return;
    const report = buildReport(s, items);
    const json = JSON.stringify(report);
    expect(report.potentialType).toBe(s.potentialType);
    expect(report.zodiac).toBe(s.zodiac);
    expect(json).not.toContain("axes");
  });
});

describe("generatePersonalityForUser(per-user 純関数・DB 非依存)", () => {
  it("性質レポート(生成根拠 + 6項目)を返す(保存はしない)", async () => {
    const report = await generatePersonalityForUser(user(1, "1990-05-17"), {
      provider,
      logger: silentLogger,
    });
    expect(report.zodiac).toBe("taurus");
    expect(Object.keys(report.items)).toHaveLength(6);
    expect(JSON.stringify(report)).not.toContain("axes");
  });

  it("パース失敗は throw する", async () => {
    await expect(
      generatePersonalityForUser(user(1, "1990-05-17"), {
        provider: { name: "empty", generate: () => Promise.resolve("JSON ではない出力") },
        logger: silentLogger,
      }),
    ).rejects.toThrow();
  });
});

describe("runPersonalityBatch", () => {
  it("未生成ユーザーは生成して保存する", async () => {
    const saved: { userId: number; reportJson: string }[] = [];
    const result = await runPersonalityBatch({
      provider,
      getUsers: () => [user(1, "1990-05-17"), user(2, "1988-03-01")],
      getExistingReport: () => null,
      saveReport: (userId, reportJson) => saved.push({ userId, reportJson }),
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(2);
    expect(result.skipped).toBe(0);
    expect(saved).toHaveLength(2);
    const report = JSON.parse(saved[0]?.reportJson ?? "{}") as { items: Record<string, string> };
    expect(Object.keys(report.items)).toHaveLength(6);
  });

  it("冪等: 署名(タイプ×星座)が一致すればスキップ(LLM を呼ばない)", async () => {
    const s = buildPersonalityStructured({ birthDate: "1990-05-17", birthTime: null });
    const existing = JSON.stringify({ potentialType: s.potentialType, zodiac: s.zodiac });
    const spy = vi.spyOn(provider, "generate");
    const saveReport = vi.fn();
    const result = await runPersonalityBatch({
      provider,
      getUsers: () => [user(1, "1990-05-17")],
      getExistingReport: () => existing,
      saveReport,
      logger: silentLogger,
    });
    expect(result.skipped).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(saveReport).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("署名が変われば(タイプ変更など)再生成する", async () => {
    const existing = JSON.stringify({ potentialType: "XX-", zodiac: "aries" });
    const saveReport = vi.fn();
    const result = await runPersonalityBatch({
      provider,
      getUsers: () => [user(1, "1990-05-17")],
      getExistingReport: () => existing,
      saveReport,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(1);
    expect(saveReport).toHaveBeenCalledTimes(1);
  });

  it("JSON パース失敗ユーザーはスキップして続行し、失敗一覧に残す", async () => {
    const saveReport = vi.fn();
    const result = await runPersonalityBatch({
      // JSON でない出力を返すプロバイダ → パース失敗 → 失敗扱い(保存しない)
      provider: {
        name: "empty",
        generate: () => Promise.resolve("JSON ではない出力"),
      },
      getUsers: () => [user(1, "1990-05-17")],
      getExistingReport: () => null,
      saveReport,
      logger: silentLogger,
    });
    expect(result.succeeded).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(saveReport).not.toHaveBeenCalled();
  });
});
