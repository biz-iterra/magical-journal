/**
 * generateMonthlyForUser(1 ユーザー分の月運生成。DB 非依存の共有ロジック)。
 *
 * 月次バッチ(runMonthlyBatch)と API(GET /api/today の月運の非同期生成)の両方から
 * 使うため、単体で「mock provider で生成できること」「気学年・気学月が節入り基準で
 * 付くこと」「空文字/失敗の分岐」を固定する。
 */

import { MasterCalendarProvider } from "@mj/calendar-data";
import { describe, expect, it, vi } from "vitest";
import { MockLlmProvider } from "../llm/mock.js";
import type { LlmProvider } from "../llm/provider.js";
import type { ActiveUser } from "../monthly/run.js";
import { generateMonthlyForUser } from "../monthly/run.js";

const calendar = new MasterCalendarProvider();
const provider = new MockLlmProvider();
const silentLogger = { info: () => undefined, error: () => undefined };

const user: ActiveUser = {
  userId: 1,
  birthDate: "1990-05-17",
  birthTime: null,
  charStyle: "male",
};

/** 固定文字列を返すだけのプロバイダ(生成結果の分岐を検証する用) */
class FixedProvider implements LlmProvider {
  readonly name = "fixed";
  constructor(private readonly text: string) {}
  generate(): Promise<string> {
    return Promise.resolve(this.text);
  }
}

describe("generateMonthlyForUser", () => {
  it("mock provider で月運文と構造化データを生成する(気学年・気学月は節入り基準)", async () => {
    const { structured, fortuneText } = await generateMonthlyForUser(user, "2026-07-23", {
      provider,
      calendar,
      logger: silentLogger,
    });

    expect(fortuneText.length).toBeGreaterThan(0);
    expect(structured.kigakuYear).toBe(2026);
    expect(structured.kigakuMonth).toBeGreaterThanOrEqual(1);
    expect(structured.kigakuMonth).toBeLessThanOrEqual(12);
    // 決定的ロジックの結果が構造化データに入っている(LLM 由来ではない)
    expect(structured.honmeiStar).toBeGreaterThanOrEqual(1);
    expect(structured.honmeiStar).toBeLessThanOrEqual(9);
    expect(structured.typeName.length).toBeGreaterThan(0);
  });

  it("DB 保存はしない(構造化データと文章を返すだけ。保存は呼び出し側の責務)", async () => {
    // provider 以外の依存を持たないことの確認: 呼び出しは provider.generate 1 回のみ
    const spy = vi.spyOn(provider, "generate");
    await generateMonthlyForUser(user, "2026-07-23", {
      provider,
      calendar,
      logger: silentLogger,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("節入り境界: 立春前後で気学年が切り替わる(暦マスタ準拠)", async () => {
    const before = await generateMonthlyForUser(user, "2026-02-03", {
      provider,
      calendar,
      logger: silentLogger,
    });
    const after = await generateMonthlyForUser(user, "2026-02-05", {
      provider,
      calendar,
      logger: silentLogger,
    });
    expect(before.structured.kigakuYear).toBe(2025);
    expect(after.structured.kigakuYear).toBe(2026);
  });

  it("生成結果が空文字なら空文字を返し、失敗としてログに残す(throw しない)", async () => {
    const errors: string[] = [];
    const { structured, fortuneText } = await generateMonthlyForUser(user, "2026-07-23", {
      provider: new FixedProvider(""),
      calendar,
      logger: { info: () => undefined, error: (m) => errors.push(m) },
    });
    expect(fortuneText).toBe("");
    expect(structured.kigakuYear).toBe(2026);
    expect(errors).toHaveLength(1);
    // 個人情報を出さない(user_id のみ。生年月日を含めない)
    expect(errors[0]).toContain("user_id=1");
    expect(errors[0]).not.toContain("1990-05-17");
  });

  it("構造化データ算出の失敗(暦マスタ範囲外)は throw する(呼び出し側でスキップ判断)", async () => {
    await expect(
      generateMonthlyForUser(
        { userId: 2, birthDate: "1800-01-01", birthTime: null, charStyle: "male" },
        "2026-07-23",
        { provider, calendar, logger: silentLogger },
      ),
    ).rejects.toThrow();
  });

  it("LLM の失敗は throw する(握りつぶさない)", async () => {
    const failing: LlmProvider = {
      name: "failing",
      generate: () => Promise.reject(new Error("LLM 呼び出し失敗")),
    };
    await expect(
      generateMonthlyForUser(user, "2026-07-23", {
        provider: failing,
        calendar,
        logger: silentLogger,
      }),
    ).rejects.toThrow("LLM 呼び出し失敗");
  });

  it("不正な char_style でも中立ボイスで生成でき、落ちない", async () => {
    const { fortuneText } = await generateMonthlyForUser(
      { ...user, charStyle: "unknown" },
      "2026-07-23",
      { provider, calendar, logger: silentLogger },
    );
    expect(fortuneText.length).toBeGreaterThan(0);
  });
});
