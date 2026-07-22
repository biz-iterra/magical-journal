import { describe, expect, it } from "vitest";
import { POTENTIAL_TABLE } from "../potential-table.js";
import { computePotential, computePotentialValue, potentialModule } from "../potential.js";
import type { PotentialTypeId } from "../types.js";

// ── 対応表の検証 ──────────────────────────────────────────

describe("POTENTIAL_TABLE", () => {
  it("長さが 60 である", () => {
    expect(POTENTIAL_TABLE).toHaveLength(60);
  });

  it("すべてのエントリが有効な PotentialTypeId である", () => {
    const validIds: Set<string> = new Set([
      "IR+",
      "IR-",
      "IL+",
      "IL-",
      "ER+",
      "ER-",
      "EL+",
      "EL-",
      "PR+",
      "PR-",
      "PL+",
      "PL-",
    ]);
    for (let i = 0; i < POTENTIAL_TABLE.length; i++) {
      expect(validIds.has(POTENTIAL_TABLE[i]!)).toBe(true);
    }
  });

  it("12タイプの割当数が 6件x6タイプ・4件x6タイプである", () => {
    const counts = new Map<PotentialTypeId, number>();
    for (const typeId of POTENTIAL_TABLE) {
      counts.set(typeId, (counts.get(typeId) ?? 0) + 1);
    }

    // 全12タイプが出現する
    expect(counts.size).toBe(12);

    // 6件のタイプ
    const sixTypes: PotentialTypeId[] = ["IR+", "ER+", "PL-", "PR-", "IL+", "EL-"];
    for (const t of sixTypes) {
      expect(counts.get(t)).toBe(6);
    }

    // 4件のタイプ
    const fourTypes: PotentialTypeId[] = ["IL-", "PR+", "ER-", "EL+", "PL+", "IR-"];
    for (const t of fourTypes) {
      expect(counts.get(t)).toBe(4);
    }

    // 合計確認: 6*6 + 4*6 = 36 + 24 = 60
    let total = 0;
    for (const c of counts.values()) {
      total += c;
    }
    expect(total).toBe(60);
  });
});

// ── computePotentialValue ──────────────────────────────────

describe("computePotentialValue", () => {
  it("CLAUDE.md 検算: 1920-01-01 -> 経過日数0 -> 算出値1", () => {
    expect(computePotentialValue("1920-01-01")).toBe(1);
  });

  it("CLAUDE.md 検算: 1920-01-02 -> 経過日数1 -> 算出値2", () => {
    expect(computePotentialValue("1920-01-02")).toBe(2);
  });

  it("CLAUDE.md 検算: 1920-03-01 -> 経過日数60(うるう年) -> 算出値1", () => {
    // 1920年はうるう年: 1月=31日 + 2月=29日 = 60日
    // (60 + 1) % 60 = 1
    expect(computePotentialValue("1920-03-01")).toBe(1);
  });

  it("算出値59の境界確認: 1920-02-28 → 経過日数58 → 算出値59", () => {
    // (58 + 1) % 60 = 59
    expect(computePotentialValue("1920-02-28")).toBe(59);
  });

  it("算出値は常に 0〜59 の範囲である", () => {
    // 各種日付でテスト
    const dates = ["1920-01-01", "1950-06-15", "1988-02-29", "2000-01-01", "2026-07-22"];
    for (const d of dates) {
      const val = computePotentialValue(d);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(60);
    }
  });

  it("基準日より前の日付でも負にならない", () => {
    expect(computePotentialValue("1919-12-31")).toBeGreaterThanOrEqual(0);
    expect(computePotentialValue("1919-12-31")).toBeLessThan(60);
    // 経過日数 = -1, (-1 + 1) % 60 = 0
    expect(computePotentialValue("1919-12-31")).toBe(0);
  });

  it("さらに前の日付でも 0〜59 に正規化される", () => {
    const val = computePotentialValue("1900-01-01");
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(60);
  });

  it("連続する日付で算出値が1ずつ増加する(mod 60 で循環)", () => {
    // 1920-01-01 から 1920-03-03 まで連続確認
    const start = computePotentialValue("1920-01-01");
    expect(start).toBe(1);

    // 翌日は +1
    expect(computePotentialValue("1920-01-02")).toBe(2);

    // 60日後は元に戻る
    expect(computePotentialValue("1920-03-01")).toBe(1);
  });

  it("うるう年を正確に扱う: 2000年はうるう年", () => {
    // 2000-02-28 と 2000-02-29 の算出値が異なること
    const feb28 = computePotentialValue("2000-02-28");
    const feb29 = computePotentialValue("2000-02-29");
    const mar01 = computePotentialValue("2000-03-01");
    expect((feb28 + 1) % 60).toBe(feb29);
    expect((feb29 + 1) % 60).toBe(mar01);
  });

  it("うるう年を正確に扱う: 1900年はうるう年でない", () => {
    // 1900-02-28 の翌日は 1900-03-01
    const feb28 = computePotentialValue("1900-02-28");
    const mar01 = computePotentialValue("1900-03-01");
    expect((feb28 + 1) % 60).toBe(mar01);
  });
});

// ── computePotential ──────────────────────────────────────

describe("computePotential", () => {
  it("CLAUDE.md 検算: 1920-01-01 -> IR+", () => {
    const result = computePotential("1920-01-01");
    expect(result.primaryType).toBe("IR+");
    expect(result.rawValue).toBe(1);
    expect(result.secondaryType).toBeUndefined();
  });

  it("CLAUDE.md 検算: 1920-01-02 -> ER+", () => {
    const result = computePotential("1920-01-02");
    expect(result.primaryType).toBe("ER+");
    expect(result.rawValue).toBe(2);
  });

  it("CLAUDE.md 検算: 1920-03-01 -> IR+(うるう年で60日経過)", () => {
    const result = computePotential("1920-03-01");
    expect(result.primaryType).toBe("IR+");
    expect(result.rawValue).toBe(1);
  });

  // ── ハイブリッドテスト ──

  it("ハイブリッド: 23:00 生まれで当日+翌日が異なるタイプ", () => {
    // 算出値1(IR+) と 算出値2(ER+) は異なるタイプ
    // 1920-01-01 は算出値1=IR+、1920-01-02 は算出値2=ER+
    const result = computePotential("1920-01-01", "23:00");
    expect(result.primaryType).toBe("IR+");
    expect(result.secondaryType).toBe("ER+");
    expect(result.rawValue).toBe(1);
  });

  it("ハイブリッド: 23:59 でもハイブリッドになる", () => {
    const result = computePotential("1920-01-01", "23:59");
    expect(result.primaryType).toBe("IR+");
    expect(result.secondaryType).toBe("ER+");
  });

  it("22:59 生まれは単一タイプ", () => {
    const result = computePotential("1920-01-01", "22:59");
    expect(result.primaryType).toBe("IR+");
    expect(result.secondaryType).toBeUndefined();
  });

  it("当日と翌日が同タイプならハイブリッドにならない(算出値27->28 はどちらも IR-)", () => {
    // 算出値27=IR-、算出値28=IR-
    // 算出値27になる日付を求める: 1920-01-01 が算出値1なので、算出値27は経過日数26日後
    // 1920-01-27 -> 経過日数26 -> (26+1)%60 = 27 -> IR-
    const val27 = computePotentialValue("1920-01-27");
    expect(val27).toBe(27);
    expect(POTENTIAL_TABLE[27]).toBe("IR-");
    expect(POTENTIAL_TABLE[28]).toBe("IR-");

    const result = computePotential("1920-01-27", "23:00");
    expect(result.primaryType).toBe("IR-");
    expect(result.secondaryType).toBeUndefined();
  });

  it("birthTime 未指定は単一タイプ", () => {
    const result = computePotential("1988-07-15");
    expect(result.secondaryType).toBeUndefined();
  });

  it("birthTime が 00:00 は単一タイプ", () => {
    const result = computePotential("1990-05-17", "00:00");
    expect(result.secondaryType).toBeUndefined();
  });

  it("birthTime が 12:30 は単一タイプ", () => {
    const result = computePotential("1990-05-17", "12:30");
    expect(result.secondaryType).toBeUndefined();
  });

  // ── 年末境界テスト ──

  it("年末 12-31 の 23:00 は翌年 1-01 を参照する", () => {
    const result = computePotential("2025-12-31", "23:00");
    const todayVal = computePotentialValue("2025-12-31");
    const tomorrowVal = computePotentialValue("2026-01-01");
    expect(result.rawValue).toBe(todayVal);
    // 翌日は 2026-01-01
    if (POTENTIAL_TABLE[todayVal] !== POTENTIAL_TABLE[tomorrowVal]) {
      expect(result.secondaryType).toBe(POTENTIAL_TABLE[tomorrowVal]);
    } else {
      expect(result.secondaryType).toBeUndefined();
    }
  });
});

// ── potentialModule ──────────────────────────────────────

describe("potentialModule", () => {
  it("id が 'potential' である", () => {
    expect(potentialModule.id).toBe("potential");
  });

  it("version が 1 である", () => {
    expect(potentialModule.version).toBe(1);
  });

  it("requiredInputs に birth_date が含まれる", () => {
    expect(potentialModule.requiredInputs).toContain("birth_date");
  });

  it("optionalInputs に birth_time が含まれる", () => {
    expect(potentialModule.optionalInputs).toContain("birth_time");
  });

  it("clientSafe が true である", () => {
    expect(potentialModule.clientSafe).toBe(true);
  });

  it("compute が ProfileInputs から PotentialResult を返す", () => {
    const result = potentialModule.compute({
      birthDate: "1990-05-17",
    });
    expect(result).toHaveProperty("primaryType");
    expect(result).toHaveProperty("rawValue");
  });

  it("compute に birthTime を渡すとハイブリッド判定が行われる", () => {
    const result = potentialModule.compute({
      birthDate: "1920-01-01",
      birthTime: "23:00",
    }) as { primaryType: string; secondaryType?: string; rawValue: number };
    expect(result.primaryType).toBe("IR+");
    expect(result.secondaryType).toBe("ER+");
  });
});
