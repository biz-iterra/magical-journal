/**
 * リッチメニュー定義(純関数・副作用なし)。
 *
 * 一次情報は docs/01_システム設計書_v0.5.md §リッチメニュー設計。
 * 2500×1686px / 2行 × 3列のグリッド・単一メニュー(切替なし)。
 *
 * ┌───────────────────────────────┬──────────────┐
 * │      (装飾。タップ領域なし)      │ ① マイタイプ   │
 * ├──────────────┬──────────────┼──────────────┤
 * │ ② 今日のジャーナル │ ③ 友達のタイプ診断 │ ④ 設定        │
 * └──────────────┴──────────────┴──────────────┘
 *
 * ★上段の左・中央は**意図的にタップ領域を置かない**(タイトル等の装飾スペース)。
 *   LINE のリッチメニューは画像全体を覆う必要がなく、領域が無い場所は無反応になる。
 *
 * すべて LIFF 起動。LIFF のパス付きディープリンク
 * (https://liff.line.me/{LIFF_ID}/<path>)を使う。packages/api/src/line/flex.ts の
 * liffDeepLink と同じ規則で、packages/liff/src/App.tsx のルート定義に対応する。
 * ※ Cloudflare Workers 側は wrangler.toml で not_found_handling =
 *   "single-page-application" を設定済みのため、サブパス直リンクでも SPA が起動する。
 *
 * ※「今日の運勢」「マイタイプ」とトークに直接入力したときの Flex カード応答は
 *   packages/api/src/line/webhook-handler.ts 側に残っている(メニューからは送らなくなった)。
 */

// ── リッチメニュー画像の仕様(LINE 規定サイズ) ──────────────────
/** リッチメニュー画像の幅(px) */
export const RICHMENU_WIDTH = 2500;
/** リッチメニュー画像の高さ(px) */
export const RICHMENU_HEIGHT = 1686;

/**
 * 3 列の幅。2500 / 3 = 833.33… のため端数 1px を左列で吸収する(834 + 833 + 833 = 2500)。
 * 隙間・重なりが出ないよう、各列の x は直前列の右端に一致させる。
 */
const COLUMN_WIDTHS = [834, 833, 833] as const;
/** 2 行の高さ。1686 / 2 = 843(割り切れる)。 */
const ROW_HEIGHTS = [843, 843] as const;

/** 列インデックス → x 座標 */
function columnX(col: number): number {
  let x = 0;
  for (let i = 0; i < col; i += 1) {
    x += COLUMN_WIDTHS[i] ?? 0;
  }
  return x;
}

/** 行インデックス → y 座標 */
function rowY(row: number): number {
  let y = 0;
  for (let i = 0; i < row; i += 1) {
    y += ROW_HEIGHTS[i] ?? 0;
  }
  return y;
}

// ── LINE リッチメニューオブジェクトの型(必要最小限) ──────────────

export interface RichMenuBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** タップ時のアクション。uri = LIFF 起動 / message = テキスト送信 */
export type RichMenuAction =
  | { readonly type: "uri"; readonly label: string; readonly uri: string }
  | { readonly type: "message"; readonly label: string; readonly text: string };

export interface RichMenuArea {
  readonly bounds: RichMenuBounds;
  readonly action: RichMenuAction;
}

export interface RichMenuObject {
  readonly size: { readonly width: number; readonly height: number };
  /** デフォルトリッチメニューとして適用するため true */
  readonly selected: boolean;
  /** 管理用の名前(LINE 上では非表示。最大 300 文字) */
  readonly name: string;
  /** トーク画面下部のバーに出る文言(最大 14 文字) */
  readonly chatBarText: string;
  readonly areas: readonly RichMenuArea[];
}

// ── LIFF パス(packages/liff/src/App.tsx のルートと一致) ──

/** 各メニューが開く LIFF のパス */
export const LIFF_PATHS = {
  today: "/",
  mytype: "/mytype",
  friend: "/friend",
  settings: "/settings",
} as const;

/**
 * LIFF ディープリンクを組み立てる。
 * flex.ts の liffDeepLink と同じ規則(https://liff.line.me/{id}{path})。
 */
export function liffUri(liffId: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://liff.line.me/${liffId}${p}`;
}

// ── メニュー定義 ────────────────────────────────────────────────

export interface BuildRichMenuInput {
  /** LIFF ID(env: LIFF_ID)。必須。①②⑤⑥ のディープリンクに使う */
  readonly liffId: string;
  /** 管理用の名前。省略時は既定値 */
  readonly name?: string;
  /** チャットバーの文言(14 文字以内)。省略時は既定値 */
  readonly chatBarText?: string;
}

const DEFAULT_NAME = "マジカルジャーナル メインメニュー";
const DEFAULT_CHAT_BAR_TEXT = "メニュー";
/** LINE 仕様の上限 */
const MAX_NAME_LENGTH = 300;
const MAX_CHAT_BAR_TEXT_LENGTH = 14;

/**
 * リッチメニューオブジェクトを組み立てる(純関数)。
 * 領域の並びは docs/01 の ①〜④(右上 → 左下 → 中央下 → 右下)。
 */
export function buildRichMenu(input: BuildRichMenuInput): RichMenuObject {
  const liffId = input.liffId.trim();
  if (!liffId) {
    throw new Error("LIFF_ID is required to build the rich menu (LIFF deep links)");
  }

  const name = input.name?.trim() || DEFAULT_NAME;
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`rich menu name must be <= ${String(MAX_NAME_LENGTH)} characters`);
  }
  const chatBarText = input.chatBarText?.trim() || DEFAULT_CHAT_BAR_TEXT;
  if (chatBarText.length > MAX_CHAT_BAR_TEXT_LENGTH) {
    throw new Error(`chatBarText must be <= ${String(MAX_CHAT_BAR_TEXT_LENGTH)} characters`);
  }

  const cell = (col: number, row: number): RichMenuBounds => ({
    x: columnX(col),
    y: rowY(row),
    width: COLUMN_WIDTHS[col] ?? 0,
    height: ROW_HEIGHTS[row] ?? 0,
  });

  const areas: readonly RichMenuArea[] = [
    // ① マイタイプ(右上) — LIFF 起動(マイタイプ詳細)
    // 上段の左・中央は装飾のためタップ領域を置かない(無反応でよい)。
    {
      bounds: cell(2, 0),
      action: {
        type: "uri",
        label: "マイタイプ",
        uri: liffUri(liffId, LIFF_PATHS.mytype),
      },
    },
    // ② 今日のジャーナル(左下・メイン導線) — LIFF 起動(今日のページ)
    {
      bounds: cell(0, 1),
      action: {
        type: "uri",
        label: "今日のジャーナル",
        uri: liffUri(liffId, LIFF_PATHS.today),
      },
    },
    // ③ 友達のタイプ診断(中央下) — LIFF 起動(端末内完結。未登録でも利用可)
    {
      bounds: cell(1, 1),
      action: {
        type: "uri",
        label: "友達のタイプ診断",
        uri: liffUri(liffId, LIFF_PATHS.friend),
      },
    },
    // ④ 設定(右下) — LIFF 起動(設定ページ)
    {
      bounds: cell(2, 1),
      action: {
        type: "uri",
        label: "設定",
        uri: liffUri(liffId, LIFF_PATHS.settings),
      },
    },
  ];

  return {
    size: { width: RICHMENU_WIDTH, height: RICHMENU_HEIGHT },
    selected: true,
    name,
    chatBarText,
    areas,
  };
}

// ── 領域の幾何検証 ──────────────────────────────────────────────

/** 2 つの矩形が重なっているか */
function overlaps(a: RichMenuBounds, b: RichMenuBounds): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * タップ領域を検証する。
 *
 * ★画像全体を覆う必要は**ない**。上段の左・中央のように意図的に領域を置かない
 *   装飾スペースがあってよく、そこはタップしても無反応になる(LINE の仕様)。
 *   以前は「面積の合計 == 画像面積」を必須にしていたが、装飾スペースを設ける
 *   デザインに変更したため、被覆の完全性は要求しない。
 *
 * 検証するのは「画像内に収まる」「整数座標」「相互に重ならない」の 3 点。
 * 重なりは LINE 側の判定順に依存して意図しない遷移を起こすため必ず弾く。
 *
 * @returns 問題のメッセージ一覧(空配列なら OK)
 */
export function validateAreas(areas: readonly RichMenuArea[]): readonly string[] {
  const problems: string[] = [];

  if (areas.length === 0) {
    problems.push("タップ領域が 1 つもない");
  }

  for (const [i, area] of areas.entries()) {
    const { x, y, width, height } = area.bounds;
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      problems.push(`area[${String(i)}]: x/y は整数であること (x=${String(x)}, y=${String(y)})`);
    }
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      problems.push(
        `area[${String(i)}]: width/height は正の整数であること ` +
          `(width=${String(width)}, height=${String(height)})`,
      );
    }
    if (x < 0 || y < 0 || x + width > RICHMENU_WIDTH || y + height > RICHMENU_HEIGHT) {
      problems.push(
        `area[${String(i)}]: 画像範囲(${String(RICHMENU_WIDTH)}×${String(RICHMENU_HEIGHT)})を` +
          `はみ出している (x=${String(x)}, y=${String(y)}, w=${String(width)}, h=${String(height)})`,
      );
    }
  }

  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      const a = areas[i];
      const b = areas[j];
      if (a && b && overlaps(a.bounds, b.bounds)) {
        problems.push(`area[${String(i)}] と area[${String(j)}] が重なっている`);
      }
    }
  }

  return problems;
}

/**
 * タップ領域が画像に占める割合(0〜1)。
 * 装飾スペースをどれだけ取っているかを dry-run で示すために使う。
 */
export function coveredRatio(areas: readonly RichMenuArea[]): number {
  const total = areas.reduce((sum, a) => sum + a.bounds.width * a.bounds.height, 0);
  return total / (RICHMENU_WIDTH * RICHMENU_HEIGHT);
}
