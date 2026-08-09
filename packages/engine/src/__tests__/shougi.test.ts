import { describe, expect, it } from "vitest";
import { JYOUI_POSITIONS } from "../kigaku/ban.js";
import { starToGogyo } from "../kigaku/honmei.js";
import {
  DIRECTION_EFFECTS,
  STAR_MEANINGS,
  getDirectionEffect,
  getStarMeaning,
} from "../kigaku/shougi.js";
import type { Direction8, StarNumber } from "../types.js";

const ALL_STARS: StarNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ALL_DIRECTIONS: Direction8[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** docs/02 §1 の五行表(日本語表記) */
const DOC_ELEMENT_LABELS: Readonly<Record<StarNumber, string>> = {
  1: "水",
  2: "土",
  3: "木",
  4: "木",
  5: "土",
  6: "金",
  7: "金",
  8: "土",
  9: "火",
};

// ── 九星の象意 ──

describe("STAR_MEANINGS", () => {
  it("9 星すべてに定義がある", () => {
    expect(Object.keys(STAR_MEANINGS)).toHaveLength(9);
    for (const star of ALL_STARS) {
      expect(STAR_MEANINGS[star]).toBeDefined();
    }
  });

  it("各エントリの star がキーと一致する", () => {
    for (const star of ALL_STARS) {
      expect(STAR_MEANINGS[star].star).toBe(star);
    }
  });

  it("五行が starToGogyo(docs/02 §1)と一致する", () => {
    for (const star of ALL_STARS) {
      expect(STAR_MEANINGS[star].element).toBe(starToGogyo(star));
    }
  });

  it("五行の日本語表記が docs/02 §1 の表と一致する", () => {
    for (const star of ALL_STARS) {
      expect(STAR_MEANINGS[star].elementLabel).toBe(DOC_ELEMENT_LABELS[star]);
    }
  });

  it("定位が JYOUI_POSITIONS(後天定位盤)と一致する", () => {
    for (const star of ALL_STARS) {
      expect(STAR_MEANINGS[star].jyoui).toBe(JYOUI_POSITIONS[star] ?? null);
    }
  });

  it("五黄(5)の定位は null(中宮)である", () => {
    expect(STAR_MEANINGS[5].jyoui).toBeNull();
  });

  it("文字列フィールドが空でない", () => {
    for (const star of ALL_STARS) {
      const m = STAR_MEANINGS[star];
      expect(m.name).not.toBe("");
      expect(m.shortName).not.toBe("");
      expect(m.elementLabel).not.toBe("");
      expect(m.favorableEffect).not.toBe("");
      expect(m.keywords.season).not.toBe("");
      expect(m.keywords.timeOfDay).not.toBe("");
    }
  });

  it("キーワード配列が空でなく、要素に空文字を含まない", () => {
    for (const star of ALL_STARS) {
      const k = STAR_MEANINGS[star].keywords;
      for (const list of [k.nature, k.person, k.matter, k.body]) {
        expect(list.length).toBeGreaterThan(0);
        for (const word of list) {
          expect(word).not.toBe("");
        }
      }
    }
  });

  it("九星名が重複しない", () => {
    const names = ALL_STARS.map((s) => STAR_MEANINGS[s].name);
    expect(new Set(names).size).toBe(9);
  });
});

describe("getStarMeaning", () => {
  it("9 星すべてで定義を返す", () => {
    for (const star of ALL_STARS) {
      expect(getStarMeaning(star)).toBe(STAR_MEANINGS[star]);
    }
  });

  it("一白水星は水・定位=北", () => {
    const m = getStarMeaning(1);
    expect(m.name).toBe("一白水星");
    expect(m.element).toBe("water");
    expect(m.jyoui).toBe("N");
  });
});

// ── 方位の効果 ──

describe("DIRECTION_EFFECTS", () => {
  it("8 方位すべてに定義がある", () => {
    expect(Object.keys(DIRECTION_EFFECTS)).toHaveLength(8);
    for (const dir of ALL_DIRECTIONS) {
      expect(DIRECTION_EFFECTS[dir]).toBeDefined();
    }
  });

  it("各エントリの direction がキーと一致する", () => {
    for (const dir of ALL_DIRECTIONS) {
      expect(DIRECTION_EFFECTS[dir].direction).toBe(dir);
    }
  });

  it("jyouiStar が JYOUI_POSITIONS(後天定位盤)と整合する", () => {
    for (const dir of ALL_DIRECTIONS) {
      const star = DIRECTION_EFFECTS[dir].jyouiStar;
      expect(JYOUI_POSITIONS[star]).toBe(dir);
    }
  });

  it("jyouiStar が 8 方位で重複せず、五黄(5)を含まない", () => {
    const stars = ALL_DIRECTIONS.map((d) => DIRECTION_EFFECTS[d].jyouiStar);
    expect(new Set(stars).size).toBe(8);
    expect(stars).not.toContain(5);
  });

  it("方位の定位星と九星の定位が相互に一致する", () => {
    for (const dir of ALL_DIRECTIONS) {
      const star = DIRECTION_EFFECTS[dir].jyouiStar;
      expect(STAR_MEANINGS[star].jyoui).toBe(dir);
    }
  });

  it("吉方位・凶方位の項目が 3〜5 件で空文字を含まない", () => {
    for (const dir of ALL_DIRECTIONS) {
      const e = DIRECTION_EFFECTS[dir];
      expect(e.name).not.toBe("");
      for (const list of [e.favorable, e.unfavorable]) {
        expect(list.length).toBeGreaterThanOrEqual(3);
        expect(list.length).toBeLessThanOrEqual(5);
        for (const item of list) {
          expect(item).not.toBe("");
        }
      }
    }
  });

  it("方位名が重複しない", () => {
    const names = ALL_DIRECTIONS.map((d) => DIRECTION_EFFECTS[d].name);
    expect(new Set(names).size).toBe(8);
  });
});

describe("getDirectionEffect", () => {
  it("8 方位すべてで定義を返す", () => {
    for (const dir of ALL_DIRECTIONS) {
      expect(getDirectionEffect(dir)).toBe(DIRECTION_EFFECTS[dir]);
    }
  });

  it("北の定位星は一白(1)", () => {
    const e = getDirectionEffect("N");
    expect(e.name).toBe("北");
    expect(e.jyouiStar).toBe(1);
  });
});
