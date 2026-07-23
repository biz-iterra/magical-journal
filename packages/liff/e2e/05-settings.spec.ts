import { expect, test } from "@playwright/test";
import { FIXTURE, waitAppReady } from "./helpers";

/**
 * §Z-2 設定画面 (Phase 1 で確認可能な範囲)
 *
 * 02-register 済み前提。現在値 (生年月日・住所・キャラスタイル) が表示され、
 * キャラスタイルを female へ変更して保存できることを確認する。
 */
test.describe("設定画面", () => {
  test("現在値の表示 + キャラスタイル変更の保存", async ({ page }) => {
    await page.goto("/settings");
    await waitAppReady(page);
    await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();

    // 生年月日が現在値 (読み取り専用) で表示される
    await expect(page.getByText("1990-05-17")).toBeVisible();

    // 住所が現在値で表示される (登録時の住所)
    await expect(page.getByLabel("住所", { exact: true })).toHaveValue(new RegExp("丸の内"));

    // 登録時は male を選択済み → female (カザネ) に切り替えて保存
    await page.getByRole("button").filter({ hasText: FIXTURE.charStyleFemaleName }).click();
    await page.getByRole("button", { name: "変更を保存" }).click();
    await expect(page.getByText("保存しました")).toBeVisible({ timeout: 15_000 });

    // 再読込しても female が保持される (永続化確認)
    await page.reload();
    await waitAppReady(page);
    // マイタイプでキャラ名がカザネ (female) に変わっていること
    await page.goto("/mytype");
    await waitAppReady(page);
    await expect(page.getByText(FIXTURE.charStyleFemaleName)).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/settings.png", fullPage: true });
  });
});
