import { describe, expect, it } from "vitest";
import { computeDestiny, destinyModule } from "../numerology/destiny.js";
import { computeLifepath, lifepathModule } from "../numerology/lifepath.js";
import { kanaToHepburn } from "../numerology/romaji.js";

// ── ライフパスナンバー ────────────────────────────────────────

describe("computeLifepath", () => {
  it("1990-05-17 → 32 → 5", () => {
    // 1+9+9+0+0+5+1+7 = 32 → 3+2 = 5
    expect(computeLifepath("1990-05-17")).toBe(5);
  });

  it("合計29 → 11(マスターナンバーで停止)", () => {
    // 1939-09-09: 1+9+3+9+0+9+0+9 = 40 ではない
    // 2000-09-29: 2+0+0+0+0+9+2+9 = 22 → マスターナンバー22
    // 1980-02-09: 1+9+8+0+0+2+0+9 = 29 → 2+9 = 11 ← これ
    expect(computeLifepath("1980-02-09")).toBe(11);
  });

  it("マスターナンバー還元フラグ OFF 時は 11→2", () => {
    // 1980-02-09 → 合計29 → 11 → マスターナンバーOFFなので 1+1=2
    expect(computeLifepath("1980-02-09", { masterNumberEnabled: false })).toBe(2);
  });

  it("合計が33になるケース → 33(マスターナンバー)", () => {
    // 1989-09-06: 1+9+8+9+0+9+0+6 = 42 ではない
    // 1996-09-09: 1+9+9+6+0+9+0+9 = 43 ではない
    // 1968-09-06: 1+9+6+8+0+9+0+6 = 39 ではない
    // 合計33: 例 1989-06-09 → 1+9+8+9+0+6+0+9 = 42 ではない
    // 1959-09-06 → 1+9+5+9+0+9+0+6 = 39 ではない
    // 全桁合算で33: 最初の合計が33になる必要がある
    // 1977-09-08: 1+9+7+7+0+9+0+8 = 41 ではない
    // 1987-08-08: 1+9+8+7+0+8+0+8 = 41
    // 1998-09-06: 1+9+9+8+0+9+0+6 = 42
    // 1977-08-08: 1+9+7+7+0+8+0+8 = 40
    // 1977-06-09: 1+9+7+7+0+6+0+9 = 39
    // 1995-09-09: 1+9+9+5+0+9+0+9 = 42
    // 1989-08-06: 1+9+8+9+0+8+0+6 = 41
    // 1998-06-09: 1+9+9+8+0+6+0+9 = 42
    // 1978-08-08: 1+9+7+8+0+8+0+8 = 41
    // 1599-09-06: 1+5+9+9+0+9+0+6 = 39
    // 直接合計33を探す:
    // 1986-09-06: 1+9+8+6+0+9+0+6 = 39
    // 1977-08-09: 1+9+7+7+0+8+0+9 = 41
    // 最初の合計は33ではなく、還元途中で33になるケースも有効:
    // 例えば合計69 → 6+9=15 → 1+5=6 (ダメ)
    // 合計78 → 7+8=15 (ダメ)
    // 合計33 → そのまま33
    // YYYYMMDD の8桁で合計33: 最大 9*8=72 なのでちょうど33は可能
    // 1956-09-03: 1+9+5+6+0+9+0+3 = 33 → マスターナンバー!
    expect(computeLifepath("1956-09-03")).toBe(33);
  });

  it("マスターナンバー還元フラグ OFF 時、33→6", () => {
    expect(computeLifepath("1956-09-03", { masterNumberEnabled: false })).toBe(6);
  });

  it("合計が22になるケース → 22(マスターナンバー)", () => {
    // 2000-09-29: 2+0+0+0+0+9+2+9 = 22
    expect(computeLifepath("2000-09-29")).toBe(22);
  });

  it("通常の1桁結果: 2000-01-01 → 4", () => {
    // 2+0+0+0+0+1+0+1 = 4
    expect(computeLifepath("2000-01-01")).toBe(4);
  });

  it("通常の1桁結果: 1988-12-25 → 9", () => {
    // 1+9+8+8+1+2+2+5 = 36 → 3+6 = 9
    expect(computeLifepath("1988-12-25")).toBe(9);
  });
});

describe("lifepathModule", () => {
  it("id / version / requiredInputs / clientSafe が正しい", () => {
    expect(lifepathModule.id).toBe("numerology_lifepath");
    expect(lifepathModule.version).toBe(1);
    expect(lifepathModule.requiredInputs).toEqual(["birth_date"]);
    expect(lifepathModule.optionalInputs).toEqual([]);
    expect(lifepathModule.clientSafe).toBe(true);
  });

  it("compute が正しい結果を返す", () => {
    const result = lifepathModule.compute({ birthDate: "1990-05-17" });
    expect(result).toEqual({ lifepath: 5 });
  });
});

// ── ローマ字変換 ──────────────────────────────────────────

describe("kanaToHepburn", () => {
  it("たなか たろう → TANAKA TARO(長音省略)", () => {
    expect(kanaToHepburn("たなか たろう")).toBe("TANAKA TARO");
  });

  it("おおた → OTA(長音省略: OO→O)", () => {
    expect(kanaToHepburn("おおた")).toBe("OTA");
  });

  it("さっき → SAKKI(促音: 次の子音を重ねる)", () => {
    expect(kanaToHepburn("さっき")).toBe("SAKKI");
  });

  it("しんぶん → SHIMBUN(撥音: B の前は M)", () => {
    expect(kanaToHepburn("しんぶん")).toBe("SHIMBUN");
  });

  it("まっちゃ → MATCHA(促音: CH の前は T)", () => {
    expect(kanaToHepburn("まっちゃ")).toBe("MATCHA");
  });

  it("カタカナ入力: タナカ タロウ → TANAKA TARO", () => {
    expect(kanaToHepburn("タナカ タロウ")).toBe("TANAKA TARO");
  });

  it("カタカナ入力: サッキ → SAKKI", () => {
    expect(kanaToHepburn("サッキ")).toBe("SAKKI");
  });

  it("こうの → KONO(う長音省略: OU→O)", () => {
    expect(kanaToHepburn("こうの")).toBe("KONO");
  });

  it("さんまい → SAMMAI(撥音: M の前は M)", () => {
    expect(kanaToHepburn("さんまい")).toBe("SAMMAI");
  });

  it("しんぱい → SHIMPAI(撥音: P の前は M)", () => {
    expect(kanaToHepburn("しんぱい")).toBe("SHIMPAI");
  });

  it("末尾のん: にほん → NIHON", () => {
    expect(kanaToHepburn("にほん")).toBe("NIHON");
  });

  it("拗音: きょうと → KYOTO(拗音+長音省略)", () => {
    expect(kanaToHepburn("きょうと")).toBe("KYOTO");
  });

  it("拗音: しょうへい → SHOHEI(拗音+長音省略)", () => {
    expect(kanaToHepburn("しょうへい")).toBe("SHOHEI");
  });

  it("複合: じゅんいちろう → JUNICHIRO(促音なし、長音省略)", () => {
    expect(kanaToHepburn("じゅんいちろう")).toBe("JUNICHIRO");
  });

  it("スペース・ハイフンはそのまま通す", () => {
    expect(kanaToHepburn("たなか-たろう")).toBe("TANAKA-TARO");
  });

  it("を → O(パスポート式)", () => {
    expect(kanaToHepburn("を")).toBe("O");
  });
});

// ── ディスティニーナンバー ─────────────────────────────────

describe("computeDestiny", () => {
  it("TANAKA TARO → 30 → 3", () => {
    // T(2)+A(1)+N(5)+A(1)+K(2)+A(1) = 12
    // T(2)+A(1)+R(9)+O(6) = 18
    // 合計 12+18 = 30 → 3+0 = 3
    expect(computeDestiny("TANAKA TARO")).toBe(3);
  });

  it("小文字入力も大文字に変換して計算される", () => {
    expect(computeDestiny("tanaka taro")).toBe(3);
  });

  it("スペース・記号は無視される", () => {
    expect(computeDestiny("TANAKA  TARO")).toBe(3);
    expect(computeDestiny("TANAKA-TARO")).toBe(3);
  });

  it("変換表が正しい: A=1, J=1, S=1", () => {
    expect(computeDestiny("A")).toBe(1);
    expect(computeDestiny("J")).toBe(1);
    expect(computeDestiny("S")).toBe(1);
  });

  it("変換表が正しい: B=2, K=2, T=2", () => {
    expect(computeDestiny("B")).toBe(2);
    expect(computeDestiny("K")).toBe(2);
    expect(computeDestiny("T")).toBe(2);
  });

  it("変換表が正しい: I=9, R=9", () => {
    expect(computeDestiny("I")).toBe(9);
    expect(computeDestiny("R")).toBe(9);
  });

  it("変換表の全26文字が正しいこと", () => {
    // ピタゴラス式: A(1)B(2)C(3)D(4)E(5)F(6)G(7)H(8)I(9)
    //              J(1)K(2)L(3)M(4)N(5)O(6)P(7)Q(8)R(9)
    //              S(1)T(2)U(3)V(4)W(5)X(6)Y(7)Z(8)
    const expected: Record<string, number> = {
      A: 1,
      B: 2,
      C: 3,
      D: 4,
      E: 5,
      F: 6,
      G: 7,
      H: 8,
      I: 9,
      J: 1,
      K: 2,
      L: 3,
      M: 4,
      N: 5,
      O: 6,
      P: 7,
      Q: 8,
      R: 9,
      S: 1,
      T: 2,
      U: 3,
      V: 4,
      W: 5,
      X: 6,
      Y: 7,
      Z: 8,
    };
    for (const [letter, value] of Object.entries(expected)) {
      // 1文字だけなので還元の必要なし(1〜9はそのまま)
      expect(computeDestiny(letter)).toBe(value);
    }
  });
});

describe("destinyModule", () => {
  it("id / version / requiredInputs / clientSafe が正しい", () => {
    expect(destinyModule.id).toBe("numerology_destiny");
    expect(destinyModule.version).toBe(1);
    expect(destinyModule.requiredInputs).toEqual(["name_kana", "name_romaji"]);
    expect(destinyModule.optionalInputs).toEqual([]);
    expect(destinyModule.clientSafe).toBe(true);
  });

  it("nameRomaji がある場合はそれを使う", () => {
    const result = destinyModule.compute({
      birthDate: "1990-01-01",
      nameKana: "たなか たろう",
      nameRomaji: "TANAKA TARO",
    });
    expect(result).toEqual({ destiny: 3, romaji: "TANAKA TARO" });
  });

  it("nameRomaji がない場合は nameKana から変換する", () => {
    const result = destinyModule.compute({
      birthDate: "1990-01-01",
      nameKana: "たなか たろう",
    });
    expect(result).toEqual({ destiny: 3, romaji: "TANAKA TARO" });
  });
});
