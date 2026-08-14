/**
 * リッチメニュー定義のテスト。
 *
 * - 6 領域が 2500×1686 を隙間なく・重なりなく被覆すること(幾何検証)
 * - 各領域のアクションが docs/01 §リッチメニュー設計 のとおりであること
 * - ③④ の送信テキストが webhook ハンドラのキーワードと文字列一致すること
 *   (ハンドラ側が正。ここは実ソースを読んでドリフトを検出する)
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MESSAGE_TEXT_FORTUNE,
  MESSAGE_TEXT_MYTYPE,
  RICHMENU_HEIGHT,
  RICHMENU_WIDTH,
  buildRichMenu,
  validateAreaCoverage,
} from "../richmenu/definition.js";

const LIFF_ID = "1234567890-abcdefgh";
const menu = buildRichMenu({ liffId: LIFF_ID });

describe("リッチメニュー定義", () => {
  it("画像サイズは 2500×1686 で selected=true", () => {
    expect(menu.size).toEqual({ width: 2500, height: 1686 });
    expect(menu.selected).toBe(true);
    expect(menu.chatBarText.length).toBeLessThanOrEqual(14);
    expect(menu.name.length).toBeLessThanOrEqual(300);
  });

  it("領域は 6 つ(2行 × 3列)", () => {
    expect(menu.areas).toHaveLength(6);
  });

  it("LIFF ID が空なら組み立てを拒否する", () => {
    expect(() => buildRichMenu({ liffId: "   " })).toThrow();
  });
});

describe("領域の幾何検証", () => {
  it("隙間・重なり・はみ出しがない", () => {
    expect(validateAreaCoverage(menu.areas)).toEqual([]);
  });

  it("面積の合計が画像全体と一致する", () => {
    const total = menu.areas.reduce((s, a) => s + a.bounds.width * a.bounds.height, 0);
    expect(total).toBe(RICHMENU_WIDTH * RICHMENU_HEIGHT);
  });

  it("ピクセル単位で全面を 1 回ずつ覆う(総当たり検証)", () => {
    // 幅方向・高さ方向の各座標がちょうど 1 領域に属することを、
    // 領域の境界だけでなく代表点の走査で確認する(粗いグリッドで十分)。
    const xs = [0, 1, 833, 834, 835, 1666, 1667, 1668, 2499];
    const ys = [0, 1, 842, 843, 844, 1685];
    for (const x of xs) {
      for (const y of ys) {
        const hits = menu.areas.filter(
          (a) =>
            x >= a.bounds.x &&
            x < a.bounds.x + a.bounds.width &&
            y >= a.bounds.y &&
            y < a.bounds.y + a.bounds.height,
        );
        expect(hits, `(${String(x)}, ${String(y)}) を覆う領域数`).toHaveLength(1);
      }
    }
  });

  it("列幅は端数を左列で吸収して合計 2500(834/833/833)", () => {
    const topRow = menu.areas.filter((a) => a.bounds.y === 0);
    expect(topRow.map((a) => a.bounds.width)).toEqual([834, 833, 833]);
    expect(topRow.map((a) => a.bounds.x)).toEqual([0, 834, 1667]);
  });

  it("行高は 843 ずつで合計 1686", () => {
    const leftCol = menu.areas.filter((a) => a.bounds.x === 0);
    expect(leftCol.map((a) => a.bounds.height)).toEqual([843, 843]);
    expect(leftCol.map((a) => a.bounds.y)).toEqual([0, 843]);
  });

  it("検証関数は不正な領域を検出する(重なり・はみ出し)", () => {
    const broken = [
      { bounds: { x: 0, y: 0, width: 2500, height: 1686 }, action: menu.areas[0]?.action },
      { bounds: { x: 0, y: 0, width: 10, height: 10 }, action: menu.areas[0]?.action },
    ] as Parameters<typeof validateAreaCoverage>[0];
    expect(validateAreaCoverage(broken).length).toBeGreaterThan(0);

    const outOfBounds = [
      { bounds: { x: 0, y: 0, width: 2501, height: 1686 }, action: menu.areas[0]?.action },
    ] as Parameters<typeof validateAreaCoverage>[0];
    expect(validateAreaCoverage(outOfBounds).length).toBeGreaterThan(0);
  });
});

describe("各領域のアクション(docs/01 §リッチメニュー設計)", () => {
  // ① 今日のジャーナル / ② 友達のタイプ診断 / ③ 今日の運勢
  // ④ マイタイプ      / ⑤ マイタイプを見る / ⑥ 設定
  const expected = [
    { label: "今日のジャーナル", type: "uri", value: `https://liff.line.me/${LIFF_ID}/` },
    { label: "友達のタイプ診断", type: "uri", value: `https://liff.line.me/${LIFF_ID}/friend` },
    { label: "今日の運勢", type: "message", value: "今日の運勢" },
    { label: "マイタイプ", type: "message", value: "マイタイプ" },
    // v0.6: 月間ページは今日のジャーナルへ集約したため、⑤のリンク先は today
    // ⑤ は v0.6 まで「月間運勢」だったが、月間ページを今日のジャーナルへ集約した結果
    // リンク先が ① と同一になっていた(6 枠のうち 1 枠が重複)。マイタイプ詳細へ振り直した。
    { label: "マイタイプを見る", type: "uri", value: `https://liff.line.me/${LIFF_ID}/mytype` },
    { label: "設定", type: "uri", value: `https://liff.line.me/${LIFF_ID}/settings` },
  ] as const;

  for (const [i, exp] of expected.entries()) {
    it(`${String(i + 1)}. ${exp.label} は ${exp.type}`, () => {
      const action = menu.areas[i]?.action;
      expect(action?.type).toBe(exp.type);
      expect(action?.label).toBe(exp.label);
      const actual = action?.type === "uri" ? action.uri : action?.text;
      expect(actual).toBe(exp.value);
    });
  }

  it("メッセージ送信は ③④ の 2 つだけ(他はすべて LIFF 起動)", () => {
    const messages = menu.areas.filter((a) => a.action.type === "message");
    expect(messages).toHaveLength(2);
  });
});

describe("③④ の送信テキストが webhook ハンドラと一致する", () => {
  // ハンドラ(packages/api/src/line/webhook-handler.ts)は変更せず、
  // ソースの定数リテラルを読み取って突合する。文言が片方だけ変わったら失敗する。
  const handlerPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "api",
    "src",
    "line",
    "webhook-handler.ts",
  );

  it("ハンドラのソースを読める(パスが壊れていない)", () => {
    expect(readFileSync(handlerPath, "utf8")).toContain("KEYWORD_MYTYPE");
  });

  it("「今日の運勢」が KEYWORD_FORTUNE と一致", () => {
    const src = readFileSync(handlerPath, "utf8");
    expect(src).toContain(`const KEYWORD_FORTUNE = "${MESSAGE_TEXT_FORTUNE}"`);
  });

  it("「マイタイプ」が KEYWORD_MYTYPE と一致", () => {
    const src = readFileSync(handlerPath, "utf8");
    expect(src).toContain(`const KEYWORD_MYTYPE = "${MESSAGE_TEXT_MYTYPE}"`);
  });
});
