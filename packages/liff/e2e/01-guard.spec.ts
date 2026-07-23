import { expect, test } from "@playwright/test";
import { waitAppReady } from "./helpers";

/**
 * §G ガード (未登録)
 *
 * 空 DB 状態 (globalSetup 直後 / まだ登録していない) で保護ページを開くと
 * /register へリダイレクトされることを確認する。
 * このファイルは DB を空のまま消費するため、必ず 02-register より前に実行する。
 */
test.describe("未登録ガード (空DB)", () => {
  test("G-1: / (今日) → /register へリダイレクト", async ({ page }) => {
    await page.goto("/");
    await waitAppReady(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "プロフィール登録" })).toBeVisible();
  });

  test("G-2: /mytype → /register へリダイレクト", async ({ page }) => {
    await page.goto("/mytype");
    await waitAppReady(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "プロフィール登録" })).toBeVisible();
  });
});
