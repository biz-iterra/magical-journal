import { describe, expect, it } from "vitest";
import { CHARACTER_MAP, getCharacter, getCharacterName } from "../mapping.js";
import type { PotentialTypeId } from "../types.js";

const ALL_TYPE_IDS: PotentialTypeId[] = [
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
];

// ── CHARACTER_MAP ──

describe("CHARACTER_MAP", () => {
  it("12 タイプすべてにマッピングが存在する", () => {
    expect(CHARACTER_MAP.size).toBe(12);
    for (const id of ALL_TYPE_IDS) {
      expect(CHARACTER_MAP.has(id)).toBe(true);
    }
  });

  it("各エントリの typeId がキーと一致する", () => {
    for (const [key, info] of CHARACTER_MAP) {
      expect(info.typeId).toBe(key);
    }
  });

  it("すべてのフィールドが空文字でない", () => {
    for (const [, info] of CHARACTER_MAP) {
      expect(info.typeName).not.toBe("");
      expect(info.characterMale).not.toBe("");
      expect(info.characterFemale).not.toBe("");
      expect(info.directoryKey).not.toBe("");
    }
  });

  it("directoryKey が characters/ で始まりスラッシュで終わる", () => {
    for (const [, info] of CHARACTER_MAP) {
      expect(info.directoryKey).toMatch(/^characters\/\d{2}-[a-z]+\/$/);
    }
  });
});

// ── getCharacter ──

describe("getCharacter", () => {
  it.each(ALL_TYPE_IDS)("タイプ %s のキャラ情報を取得できる", (typeId) => {
    const info = getCharacter(typeId);
    expect(info.typeId).toBe(typeId);
    expect(info.typeName).toBeTruthy();
    expect(info.characterMale).toBeTruthy();
    expect(info.characterFemale).toBeTruthy();
    expect(info.directoryKey).toBeTruthy();
  });

  it("docs/04 調整後のタイプ名が使用されている(IR-)", () => {
    expect(getCharacter("IR-").typeName).toBe("静かに核心を突く発想家");
  });

  it("docs/04 調整後のタイプ名が使用されている(EL+)", () => {
    expect(getCharacter("EL+").typeName).toBe("面倒見のよい育て上手");
  });

  it("docs/04 調整後のタイプ名が使用されている(PR-)", () => {
    expect(getCharacter("PR-").typeName).toBe("黙々と腕を磨く職人肌");
  });

  it("存在しないタイプ ID でエラーが投げられる", () => {
    expect(() => getCharacter("XX+" as PotentialTypeId)).toThrow("Unknown PotentialTypeId: XX+");
  });
});

// ── getCharacterName ──

describe("getCharacterName", () => {
  it.each(ALL_TYPE_IDS)("タイプ %s の male バリアントが返る", (typeId) => {
    const name = getCharacterName(typeId, "male");
    expect(name).toBeTruthy();
    expect(name).toBe(getCharacter(typeId).characterMale);
  });

  it.each(ALL_TYPE_IDS)("タイプ %s の female バリアントが返る", (typeId) => {
    const name = getCharacterName(typeId, "female");
    expect(name).toBeTruthy();
    expect(name).toBe(getCharacter(typeId).characterFemale);
  });

  // CSV データとの具体値照合
  const sampleCases: [PotentialTypeId, "male" | "female", string][] = [
    ["IR+", "male", "ヒカル"],
    ["IR+", "female", "ヒカリ"],
    ["IR-", "male", "ツクモ"],
    ["IR-", "female", "ツクヨ"],
    ["IL+", "male", "カゼマ"],
    ["IL+", "female", "カザネ"],
    ["IL-", "male", "キリヤ"],
    ["IL-", "female", "キリハ"],
    ["ER+", "male", "ニジオ"],
    ["ER+", "female", "ニジカ"],
    ["ER-", "male", "ツユマ"],
    ["ER-", "female", "ツユハ"],
    ["EL+", "male", "アサヒ"],
    ["EL+", "female", "ヒナタ"],
    ["EL-", "male", "ミナト"],
    ["EL-", "female", "コハク"],
    ["PR+", "male", "ホムラ"],
    ["PR+", "female", "ホノカ"],
    ["PR-", "male", "タキト"],
    ["PR-", "female", "タキミ"],
    ["PL+", "male", "タカネ"],
    ["PL+", "female", "ミネカ"],
    ["PL-", "male", "イワオ"],
    ["PL-", "female", "イワミ"],
  ];

  it.each(sampleCases)("%s (%s) -> %s", (typeId, style, expected) => {
    expect(getCharacterName(typeId, style)).toBe(expected);
  });

  it("存在しないタイプ ID でエラーが投げられる", () => {
    expect(() => getCharacterName("ZZ-" as PotentialTypeId, "male")).toThrow(
      "Unknown PotentialTypeId: ZZ-",
    );
  });
});
