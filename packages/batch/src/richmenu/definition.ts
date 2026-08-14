/**
 * リッチメニュー定義(純関数・副作用なし)。
 *
 * 一次情報は docs/01_システム設計書_v0.5.md §リッチメニュー設計。
 * 2500×1686px / 2行 × 3列の 6 分割・単一メニュー(切替なし)。
 *
 * ┌──────────────┬──────────────┬──────────────┐
 * │ ① 今日のジャーナル │ ② 友達のタイプ診断 │ ③ 今日の運勢を聞く │
 * ├──────────────┼──────────────┼──────────────┤
 * │ ④ マイタイプ      │ ⑤ マイタイプを見る │ ⑥ 設定           │
 * └──────────────┴──────────────┴──────────────┘
 *
 * ③④は「メッセージ送信」。送信テキストは packages/api/src/line/webhook-handler.ts の
 * KEYWORD_FORTUNE / KEYWORD_MYTYPE と完全一致させること(ハンドラ側が正)。
 * 一致は __tests__/richmenu.test.ts で機械的に検証している。
 *
 * ①②⑤⑥は LIFF 起動。LIFF のパス付きディープリンク
 * (https://liff.line.me/{LIFF_ID}/<path>)を使う。packages/api/src/line/flex.ts の
 * liffDeepLink と同じ規則で、packages/liff/src/App.tsx のルート定義に対応する。
 * ※ Cloudflare Workers 側は wrangler.toml で not_found_handling =
 *   "single-page-application" を設定済みのため、サブパス直リンクでも SPA が起動する。
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

// ── ③④ の送信テキスト(webhook ハンドラと一致必須) ────────────────

/** ③ 今日の運勢を聞く → 送信テキスト(webhook の KEYWORD_FORTUNE と一致) */
export const MESSAGE_TEXT_FORTUNE = "今日の運勢";
/** ④ マイタイプ → 送信テキスト(webhook の KEYWORD_MYTYPE と一致) */
export const MESSAGE_TEXT_MYTYPE = "マイタイプ";

// ── ①②⑤⑥ の LIFF パス(packages/liff/src/App.tsx のルートと一致) ──

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
 * 領域の並びは docs/01 の ①〜⑥(左上 → 右上 → 左下 → 右下)。
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
    // ① 今日のジャーナル(左上・メイン導線) — LIFF 起動(今日のページ)
    {
      bounds: cell(0, 0),
      action: {
        type: "uri",
        label: "今日のジャーナル",
        uri: liffUri(liffId, LIFF_PATHS.today),
      },
    },
    // ② 友達のタイプ診断(中央上) — LIFF 起動(端末内完結。未登録でも利用可)
    {
      bounds: cell(1, 0),
      action: {
        type: "uri",
        label: "友達のタイプ診断",
        uri: liffUri(liffId, LIFF_PATHS.friend),
      },
    },
    // ③ 今日の運勢を聞く(右上) — メッセージ送信 → webhook が Flex 運勢カードを返信
    {
      bounds: cell(2, 0),
      action: { type: "message", label: "今日の運勢", text: MESSAGE_TEXT_FORTUNE },
    },
    // ④ マイタイプ(左下) — メッセージ送信 → webhook が Flex タイプカードを返信
    {
      bounds: cell(0, 1),
      action: { type: "message", label: "マイタイプ", text: MESSAGE_TEXT_MYTYPE },
    },
    // ⑤ マイタイプを見る(中央下) — LIFF 起動(マイタイプ詳細)。
    // ④ は「メッセージ送信 → Flex カード」なので導線が異なる。
    // ④=トーク内で軽く見る / ⑤=詳細をじっくり見る、という住み分け。
    //
    // v0.6 までは「月間運勢」だったが、月間ページを今日のジャーナルへ集約した結果
    // リンク先が ① と同一になり、6 枠のうち 1 枠が重複していた。画像刷新に合わせて解消。
    {
      bounds: cell(1, 1),
      action: {
        type: "uri",
        label: "マイタイプを見る",
        uri: liffUri(liffId, LIFF_PATHS.mytype),
      },
    },
    // ⑥ 設定(右下) — LIFF 起動(設定ページ)
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
 * 領域が画像全体を「隙間なく・重なりなく」覆っているかを検証する。
 *
 * 「全領域が画像内に収まる」＋「面積の合計が画像面積と一致」＋「相互に重ならない」
 * の 3 条件が揃えば、隙間ゼロの完全被覆であることが数学的に保証される。
 *
 * @returns 問題のメッセージ一覧(空配列なら OK)
 */
export function validateAreaCoverage(areas: readonly RichMenuArea[]): readonly string[] {
  const problems: string[] = [];

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

  const total = areas.reduce((sum, a) => sum + a.bounds.width * a.bounds.height, 0);
  const expected = RICHMENU_WIDTH * RICHMENU_HEIGHT;
  if (total !== expected) {
    problems.push(
      `領域の面積合計が画像面積と一致しない(合計=${String(total)} / 期待=${String(expected)})。隙間または過不足がある`,
    );
  }

  return problems;
}
