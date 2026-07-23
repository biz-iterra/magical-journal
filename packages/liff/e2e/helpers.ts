import type { Page } from "@playwright/test";

/**
 * 検算済み基準データ (CLAUDE.md / docs/09)。架空データのみ。
 * 1990-05-17 生 / やまだ たろう → YAMADA TARO
 * → 牡牛座 / IL+ (カゼマ/カザネ) / 一白水星・五黄土星 / ライフパス 5 / ディスティニー 9
 */
export const FIXTURE = {
  year: "1990",
  month: "5",
  day: "17",
  familyKana: "やまだ",
  givenKana: "たろう",
  romaji: "YAMADA TARO",
  address: "東京都千代田区丸の内一丁目",
  charStyleMaleName: "カゼマ",
  charStyleFemaleName: "カザネ",
  expected: {
    zodiac: "牡牛座",
    typeId: "IL+",
    honmei: "一白水星",
    getsumei: "五黄土星",
    lifepath: "5",
    destiny: "9",
  },
} as const;

/**
 * LIFF 初期化 (dev モックユーザー) の完了を待つ。
 * App は初期化中「読み込み中...」を表示するため、消えるまで待機する。
 */
export async function waitAppReady(page: Page): Promise<void> {
  await page
    .getByText("読み込み中...", { exact: true })
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => {
      /* 既に描画済みなら無視 */
    });
}
