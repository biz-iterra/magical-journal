import { expect, test } from "@playwright/test";
import { FIXTURE, waitAppReady } from "./helpers";

/**
 * §C 登録済みユーザーの再訪 + §E 今日のページ (方位)
 *
 * 02-register で mock-user を登録済みの前提。/ を開くと登録画面ではなく
 * 今日のページが表示され、本命星/月命星・方位グリッド・盤切替タブが機能する。
 *
 * 注: dev モードは Maps キー未設定 → 座標なし登録のため方位マップ (地図描画) は
 * 表示されない想定。方位グリッドと盤データがあれば合格 (docs/09 / 依頼の制約)。
 */
test.describe("登録済み再訪 / 今日のページ", () => {
  test("C-1 + E-1/E-2: 今日のページが表示され盤タブが切り替わる", async ({ page }) => {
    await page.goto("/");
    await waitAppReady(page);

    // C-1: /register にリダイレクトされない
    await expect(page).toHaveURL(/localhost:5173\/$/);
    await expect(page.getByRole("heading", { name: "今日のジャーナル" })).toBeVisible();

    // 本命星 一白水星 / 月命星 五黄土星
    await expect(page.getByText(FIXTURE.expected.honmei)).toBeVisible();
    await expect(page.getByText(FIXTURE.expected.getsumei)).toBeVisible();

    // E-1: 方位グリッド (8 方位) が表示される
    for (const dir of ["北", "北東", "東", "南東", "南", "南西", "西", "北西"]) {
      await expect(page.getByText(dir, { exact: true }).first()).toBeVisible();
    }

    // 日盤タブ選択時の中宮表示
    await expect(page.getByText(/中宮:/)).toBeVisible();

    // E-2: 盤切替タブ (日盤/月盤/年盤)
    await expect(page.getByRole("button", { name: "日盤" })).toBeVisible();
    await page.getByRole("button", { name: "月盤" }).click();
    // 月盤に切り替えると中宮ラベル (日盤専用) が消える
    await expect(page.getByText(/中宮:/)).toHaveCount(0);
    await page.getByRole("button", { name: "年盤" }).click();
    await page.getByRole("button", { name: "日盤" }).click();
    await expect(page.getByText(/中宮:/)).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/today.png", fullPage: true });
  });
});
