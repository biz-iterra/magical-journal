/**
 * リッチメニュー定義のテスト。
 *
 * - タップ領域が 4 つで、はみ出し・重なりがないこと(幾何検証)
 * - 上段の左・中央は**意図的に無反応**であること(装飾スペース)
 * - 各領域のアクションが docs/01 §リッチメニュー設計 のとおりであること
 * - リンク先が LIFF のルート定義(packages/liff/src/App.tsx)と一致すること
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  RICHMENU_HEIGHT,
  RICHMENU_WIDTH,
  buildRichMenu,
  coveredRatio,
  validateAreas,
} from "../richmenu/definition.js";

const LIFF_ID = "1234567890-abcdefgh";
const menu = buildRichMenu({ liffId: LIFF_ID });

/** 座標 (x, y) を覆うタップ領域の数 */
function hitCount(x: number, y: number): number {
  return menu.areas.filter(
    (a) =>
      x >= a.bounds.x &&
      x < a.bounds.x + a.bounds.width &&
      y >= a.bounds.y &&
      y < a.bounds.y + a.bounds.height,
  ).length;
}

describe("リッチメニュー定義", () => {
  it("画像サイズは 2500×1686 で selected=true", () => {
    expect(menu.size).toEqual({ width: 2500, height: 1686 });
    expect(menu.selected).toBe(true);
    expect(menu.chatBarText.length).toBeLessThanOrEqual(14);
    expect(menu.name.length).toBeLessThanOrEqual(300);
  });

  it("タップ領域は 4 つ(右上 + 下段 3 つ)", () => {
    expect(menu.areas).toHaveLength(4);
  });

  it("LIFF ID が空なら組み立てを拒否する", () => {
    expect(() => buildRichMenu({ liffId: "   " })).toThrow();
  });
});

describe("領域の幾何検証", () => {
  it("はみ出し・重なりがない", () => {
    expect(validateAreas(menu.areas)).toEqual([]);
  });

  it("上段の左・中央はタップしても無反応(装飾スペース)", () => {
    // 左上・中央上のどこを突いても、どの領域にも属さないこと
    for (const x of [0, 400, 833, 834, 1200, 1666]) {
      for (const y of [0, 400, 842]) {
        expect(hitCount(x, y), `(${String(x)}, ${String(y)}) は無反応であること`).toBe(0);
      }
    }
  });

  it("右上と下段 3 つはちょうど 1 領域に属する", () => {
    const tappable: [number, number][] = [
      [1667, 0], // 右上(マイタイプ)
      [2499, 842],
      [0, 843], // 左下(今日のジャーナル)
      [833, 1685],
      [834, 843], // 中央下(友達のタイプ診断)
      [1666, 1685],
      [1667, 843], // 右下(設定)
      [2499, 1685],
    ];
    for (const [x, y] of tappable) {
      expect(hitCount(x, y), `(${String(x)}, ${String(y)}) はタップ可能であること`).toBe(1);
    }
  });

  it("下段は 3 列で合計 2500(834/833/833)", () => {
    const bottom = menu.areas.filter((a) => a.bounds.y === 843);
    expect(bottom).toHaveLength(3);
    expect(bottom.map((a) => a.bounds.width)).toEqual([834, 833, 833]);
    expect(bottom.map((a) => a.bounds.x)).toEqual([0, 834, 1667]);
  });

  it("行高は 843 ずつ", () => {
    for (const a of menu.areas) {
      expect(a.bounds.height).toBe(843);
    }
  });

  it("タップ可能な面積は全体の約 62%(残りは装飾スペース)", () => {
    // 右上 1 枠 + 下段 3 枠 = 4/6 相当。置き忘れとの区別のため数値で固定する。
    const ratio = coveredRatio(menu.areas);
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(0.7);
    const total = menu.areas.reduce((s, a) => s + a.bounds.width * a.bounds.height, 0);
    expect(total).toBe(833 * 843 + 2500 * 843);
    expect(RICHMENU_WIDTH * RICHMENU_HEIGHT).toBe(2500 * 1686);
  });

  it("検証関数は不正な領域を検出する(重なり・はみ出し・空)", () => {
    const overlapping = [
      { bounds: { x: 0, y: 0, width: 2500, height: 1686 }, action: menu.areas[0]?.action },
      { bounds: { x: 0, y: 0, width: 10, height: 10 }, action: menu.areas[0]?.action },
    ] as Parameters<typeof validateAreas>[0];
    expect(validateAreas(overlapping).length).toBeGreaterThan(0);

    const outOfBounds = [
      { bounds: { x: 0, y: 0, width: 2501, height: 1686 }, action: menu.areas[0]?.action },
    ] as Parameters<typeof validateAreas>[0];
    expect(validateAreas(outOfBounds).length).toBeGreaterThan(0);

    expect(validateAreas([]).length).toBeGreaterThan(0);
  });
});

describe("各領域のアクション(docs/01 §リッチメニュー設計)", () => {
  // ① マイタイプ(右上)
  // ② 今日のジャーナル / ③ 友達のタイプ診断 / ④ 設定(下段)
  const expected = [
    { label: "マイタイプ", path: "/mytype", x: 1667, y: 0 },
    { label: "今日のジャーナル", path: "/", x: 0, y: 843 },
    { label: "友達のタイプ診断", path: "/friend", x: 834, y: 843 },
    { label: "設定", path: "/settings", x: 1667, y: 843 },
  ] as const;

  for (const [i, exp] of expected.entries()) {
    it(`${String(i + 1)}. ${exp.label} は ${exp.path} を開く`, () => {
      const area = menu.areas[i];
      expect(area?.action.type).toBe("uri");
      expect(area?.action.label).toBe(exp.label);
      const uri = area?.action.type === "uri" ? area.action.uri : undefined;
      expect(uri).toBe(`https://liff.line.me/${LIFF_ID}${exp.path}`);
      expect(area?.bounds.x).toBe(exp.x);
      expect(area?.bounds.y).toBe(exp.y);
    });
  }

  it("すべて LIFF 起動(メッセージ送信の枠はもう無い)", () => {
    expect(menu.areas.every((a) => a.action.type === "uri")).toBe(true);
  });
});

describe("リンク先が LIFF のルート定義と一致する", () => {
  // packages/liff/src/App.tsx のソースを読み、メニューが開くパスが
  // 実在するルートであることを確かめる(片方だけ変わったら失敗する)。
  const appPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "liff",
    "src",
    "App.tsx",
  );

  it("App.tsx を読める(パスが壊れていない)", () => {
    expect(readFileSync(appPath, "utf8")).toContain("<Route");
  });

  it("メニューが開く全パスが App.tsx にルートとして存在する", () => {
    const src = readFileSync(appPath, "utf8");
    for (const area of menu.areas) {
      if (area.action.type !== "uri") continue;
      const p = area.action.uri.replace(`https://liff.line.me/${LIFF_ID}`, "");
      expect(src, `${p} のルートが App.tsx に無い`).toContain(`path="${p}"`);
    }
  });
});
