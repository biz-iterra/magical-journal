import { describe, expect, it } from "vitest";
import { parseDailySections } from "../daily/sections.js";

describe("parseDailySections", () => {
  it("素の JSON を3セクションにパースする", () => {
    const raw = '{"fortune":"運勢文","schedule":"15時にカフェへ","characterNote":"がんばろう"}';
    const { sections, parsed } = parseDailySections(raw);
    expect(parsed).toBe(true);
    expect(sections.fortune).toBe("運勢文");
    expect(sections.schedule).toBe("15時にカフェへ");
    expect(sections.characterNote).toBe("がんばろう");
  });

  it("コードフェンス付き JSON も取り出す", () => {
    const raw = '```json\n{"fortune":"a","schedule":"b","characterNote":"c"}\n```';
    const { sections, parsed } = parseDailySections(raw);
    expect(parsed).toBe(true);
    expect(sections.fortune).toBe("a");
  });

  it("前後に説明文が混じっても最初の {...} を拾う", () => {
    const raw = 'はい、出力です:\n{"fortune":"x","schedule":"y","characterNote":"z"} 以上です';
    const { sections, parsed } = parseDailySections(raw);
    expect(parsed).toBe(true);
    expect(sections.schedule).toBe("y");
  });

  it("文字列内の波括弧に惑わされない", () => {
    const raw = '{"fortune":"{中括弧}を含む","schedule":"s","characterNote":"c"}';
    const { sections, parsed } = parseDailySections(raw);
    expect(parsed).toBe(true);
    expect(sections.fortune).toBe("{中括弧}を含む");
  });

  it("JSON でない生出力はフォールバック(characterNote に全体)", () => {
    const raw = "これはただの文章で JSON ではありません。";
    const { sections, parsed } = parseDailySections(raw);
    expect(parsed).toBe(false);
    expect(sections.characterNote).toBe(raw);
    expect(sections.fortune).toBe("");
  });

  it("全項目空の JSON はフォールバック扱い", () => {
    const raw = '{"fortune":"","schedule":"","characterNote":""}';
    const { parsed } = parseDailySections(raw);
    expect(parsed).toBe(false);
  });
});
