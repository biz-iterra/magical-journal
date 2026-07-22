import { describe, expect, it, vi } from "vitest";
import { DiagnosisRegistry } from "../registry.js";
import type { DiagnosisModule, InputKey, ProfileInputs } from "../types.js";

// ── テスト用ヘルパー ──

function createModule(overrides: Partial<DiagnosisModule> & { id: string }): DiagnosisModule {
  return {
    version: 1,
    requiredInputs: ["birth_date"] as readonly InputKey[],
    optionalInputs: [] as readonly InputKey[],
    clientSafe: true,
    compute: vi.fn(() => ({ type: overrides.id })),
    ...overrides,
  };
}

const baseInputs: ProfileInputs = {
  birthDate: "1990-05-17",
};

// ── テスト ──

describe("DiagnosisRegistry", () => {
  it("enabled モジュールのみが getEnabled に現れる", () => {
    const registry = new DiagnosisRegistry();
    const modA = createModule({ id: "a" });
    const modB = createModule({ id: "b" });
    const modC = createModule({ id: "c" });

    registry.register(modA, "enabled", 1);
    registry.register(modB, "held", 2);
    registry.register(modC, "planned", 3);

    const enabled = registry.getEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0]?.id).toBe("a");
  });

  it("held モジュールが getEnabled / getClientSafe / computeAll に含まれない", () => {
    const registry = new DiagnosisRegistry();
    const heldModule = createModule({ id: "seimei", clientSafe: true });

    registry.register(heldModule, "held", 1);

    expect(registry.getEnabled()).toHaveLength(0);
    expect(registry.getClientSafe()).toHaveLength(0);

    const results = registry.computeAll(baseInputs);
    expect(results.size).toBe(0);
    expect(heldModule.compute).not.toHaveBeenCalled();
  });

  it("clientSafe=false のモジュールが getClientSafe に含まれない", () => {
    const registry = new DiagnosisRegistry();
    const serverOnly = createModule({
      id: "kigaku_direction",
      clientSafe: false,
    });
    const clientSafe = createModule({
      id: "zodiac",
      clientSafe: true,
    });

    registry.register(serverOnly, "enabled", 1);
    registry.register(clientSafe, "enabled", 2);

    const safe = registry.getClientSafe();
    expect(safe).toHaveLength(1);
    expect(safe[0]?.id).toBe("zodiac");
  });

  it("getRequiredInputs が enabled モジュールの要求入力の和集合を返す", () => {
    const registry = new DiagnosisRegistry();
    const modA = createModule({
      id: "a",
      requiredInputs: ["birth_date", "birth_time"],
    });
    const modB = createModule({
      id: "b",
      requiredInputs: ["birth_date", "name_kana"],
    });
    // held モジュールの requiredInputs は含まれないことも確認
    const modC = createModule({
      id: "c",
      requiredInputs: ["name_kanji"],
    });

    registry.register(modA, "enabled", 1);
    registry.register(modB, "enabled", 2);
    registry.register(modC, "held", 3);

    const required = registry.getRequiredInputs();
    expect(required).toEqual(new Set(["birth_date", "birth_time", "name_kana"]));
    // held モジュールの name_kanji は含まれない
    expect(required.has("name_kanji")).toBe(false);
  });

  it("getOptionalInputs から required と重複するものが除外される", () => {
    const registry = new DiagnosisRegistry();
    const modA = createModule({
      id: "a",
      requiredInputs: ["birth_date"],
      optionalInputs: ["birth_time"],
    });
    const modB = createModule({
      id: "b",
      requiredInputs: ["birth_time"], // modA では optional だが modB では required
      optionalInputs: ["name_kana"],
    });

    registry.register(modA, "enabled", 1);
    registry.register(modB, "enabled", 2);

    const optional = registry.getOptionalInputs();
    // birth_time は modA で optional だが modB で required なので除外される
    expect(optional.has("birth_time")).toBe(false);
    // name_kana はどこでも required でないので含まれる
    expect(optional.has("name_kana")).toBe(true);
    expect(optional.size).toBe(1);
  });

  it("重複 id の登録でエラーになる", () => {
    const registry = new DiagnosisRegistry();
    const mod1 = createModule({ id: "zodiac" });
    const mod2 = createModule({ id: "zodiac", version: 2 });

    registry.register(mod1, "enabled", 1);

    expect(() => registry.register(mod2, "enabled", 2)).toThrow(
      'module "zodiac" is already registered',
    );
  });

  it("computeAll が enabled モジュールすべてを実行する", () => {
    const registry = new DiagnosisRegistry();
    const modA = createModule({ id: "zodiac" });
    const modB = createModule({ id: "potential" });
    const modC = createModule({ id: "seimei" }); // held

    registry.register(modA, "enabled", 1);
    registry.register(modB, "enabled", 2);
    registry.register(modC, "held", 3);

    const results = registry.computeAll(baseInputs);

    expect(results.size).toBe(2);
    expect(results.has("zodiac")).toBe(true);
    expect(results.has("potential")).toBe(true);
    expect(results.has("seimei")).toBe(false);

    expect(modA.compute).toHaveBeenCalledWith(baseInputs, undefined);
    expect(modB.compute).toHaveBeenCalledWith(baseInputs, undefined);
    expect(modC.compute).not.toHaveBeenCalled();
  });

  it("displayOrder 順にソートされる", () => {
    const registry = new DiagnosisRegistry();
    const modC = createModule({ id: "c" });
    const modA = createModule({ id: "a" });
    const modB = createModule({ id: "b" });

    // 登録順序と displayOrder を意図的に異なる順にする
    registry.register(modC, "enabled", 30);
    registry.register(modA, "enabled", 10);
    registry.register(modB, "enabled", 20);

    const enabled = registry.getEnabled();
    expect(enabled.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("getModule で id を指定して登録情報を取得できる", () => {
    const registry = new DiagnosisRegistry();
    const mod = createModule({ id: "numerology_lifepath" });

    registry.register(mod, "enabled", 5);

    const reg = registry.getModule("numerology_lifepath");
    expect(reg).toBeDefined();
    expect(reg?.module.id).toBe("numerology_lifepath");
    expect(reg?.status).toBe("enabled");
    expect(reg?.displayOrder).toBe(5);
  });

  it("getModule で未登録の id は undefined を返す", () => {
    const registry = new DiagnosisRegistry();
    expect(registry.getModule("nonexistent")).toBeUndefined();
  });

  it("computeAll に masters を渡すとモジュールに転送される", () => {
    const registry = new DiagnosisRegistry();
    const mod = createModule({ id: "test" });
    const masters = { some: "data" };

    registry.register(mod, "enabled", 1);
    registry.computeAll(baseInputs, masters);

    expect(mod.compute).toHaveBeenCalledWith(baseInputs, masters);
  });

  it("getClientSafe も displayOrder 順にソートされる", () => {
    const registry = new DiagnosisRegistry();
    const modZ = createModule({ id: "z", clientSafe: true });
    const modA = createModule({ id: "a", clientSafe: true });
    const modM = createModule({ id: "m", clientSafe: false }); // 除外される

    registry.register(modZ, "enabled", 30);
    registry.register(modA, "enabled", 10);
    registry.register(modM, "enabled", 20);

    const safe = registry.getClientSafe();
    expect(safe.map((m) => m.id)).toEqual(["a", "z"]);
  });
});
