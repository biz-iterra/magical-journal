import { expect, test } from "@playwright/test";
import { FIXTURE, waitAppReady } from "./helpers";

/**
 * §F 友達のタイプ診断 (端末内完結)
 *
 * 最重要: 入力値がサーバーへ送信されないこと (CLAUDE.md ルール5 / docs/09 E-4) を
 * 全リクエスト監視で厳密に検証する。友達診断ページ表示後の一切の /api リクエストを
 * 記録し、診断実行後もゼロであることを assert する。
 * さらに方位/運勢セクションが無い (性格診断のみ) ことを確認する。
 */
test.describe("友達診断", () => {
  test("F: 端末内で完結し API に送信しない + 方位/運勢が無い", async ({ page }) => {
    // バックエンド API (/api/* エンドポイント) への全リクエストを記録。
    // 注: Vite dev はソースモジュール /src/api/client.ts も配信するため、
    //     pathname が "/api/" で始まるものだけを API 送信として判定する
    //     (/src/api/... や /@vite/... は除外)。
    const apiRequests: string[] = [];
    page.on("request", (req) => {
      let pathname: string;
      try {
        pathname = new URL(req.url()).pathname;
      } catch {
        return;
      }
      if (pathname.startsWith("/api/")) apiRequests.push(`${req.method()} ${req.url()}`);
    });

    await page.goto("/friend");
    await waitAppReady(page);
    await expect(page.getByRole("heading", { name: "友達のタイプ診断" })).toBeVisible();

    // 監視の基準点: ページ表示までに発生した /api を記録 (友達ページ自体は 0 のはず)
    const beforeCount = apiRequests.length;

    // 生年月日 1990-05-17 を入力 (select は selectOption でネイティブイベント発火)
    const selects = page.locator("form select");
    await selects.nth(0).selectOption(FIXTURE.year);
    await selects.nth(1).selectOption(FIXTURE.month);
    await selects.nth(2).selectOption(FIXTURE.day);
    // 氏名かなも入力してディスティニーまで確認
    await page.getByPlaceholder("せい").fill(FIXTURE.familyKana);
    await page.getByPlaceholder("めい").fill(FIXTURE.givenKana);

    await page.getByRole("button", { name: "診断する" }).click();

    // 結果表示 (基準値)
    await expect(page.getByRole("heading", { name: "診断結果" })).toBeVisible();
    await expect(page.getByText(FIXTURE.expected.typeId, { exact: true })).toBeVisible();
    await expect(page.getByText(FIXTURE.expected.zodiac)).toBeVisible();
    await expect(page.getByText(FIXTURE.expected.honmei)).toBeVisible();
    await expect(
      page.getByText("ライフパスナンバー", { exact: true }).locator("xpath=following-sibling::*[1]"),
    ).toHaveText(new RegExp(FIXTURE.expected.lifepath));
    await expect(
      page
        .getByText("ディスティニーナンバー", { exact: true })
        .locator("xpath=following-sibling::*[1]"),
    ).toHaveText(new RegExp(FIXTURE.expected.destiny));

    // ── 最重要: 診断実行前後で /api リクエストが 1 件も発生していないこと ──
    expect(apiRequests, `API へのリクエストが発生: ${apiRequests.join(", ")}`).toEqual([]);
    expect(apiRequests.length).toBe(beforeCount);
    expect(beforeCount).toBe(0);

    // F-3: 方位・運勢セクションが無い (性格診断のみ)
    await expect(page.getByText(/方位/)).toHaveCount(0);
    await expect(page.getByText(/運勢/)).toHaveCount(0);
    await expect(page.getByText(/日盤|月盤|年盤/)).toHaveCount(0);

    // プライバシー注記
    await expect(page.getByText(/サーバーに送信されません/)).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/friend.png", fullPage: true });
  });
});
