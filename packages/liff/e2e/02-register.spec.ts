import { expect, test } from "@playwright/test";
import { FIXTURE, waitAppReady } from "./helpers";

/**
 * §B 新規登録フロー + §D マイタイプ表示
 *
 * 空 DB → 3 ステップ登録 → /mytype 遷移 → 基準値表示を確認する。
 * このテストで mock-user を登録するため、以降の 03/04/05 が成立する。
 */
test.describe("新規登録フロー", () => {
  test("B: 3ステップ登録 → D: マイタイプに基準値が表示される", async ({ page }) => {
    await page.goto("/register");
    await waitAppReady(page);
    await expect(page.getByRole("heading", { name: "プロフィール登録" })).toBeVisible();

    // ── Step 1: 生年月日 (1990-05-17) ──────────────────────
    await page.getByLabel("生年").selectOption(FIXTURE.year);
    await page.getByLabel("月", { exact: true }).selectOption(FIXTURE.month);
    await page.getByLabel("日", { exact: true }).selectOption(FIXTURE.day);
    // 出生時刻は未入力のまま進める (B-3: 任意項目)
    await page.getByRole("button", { name: /次へ/ }).click();

    // ── Step 2: 氏名かな + ローマ字自動変換 + 住所 ──────────
    await page.getByLabel("姓（ひらがな）").fill(FIXTURE.familyKana);
    await page.getByLabel("名（ひらがな）").fill(FIXTURE.givenKana);
    // B-5: ヘボン式で YAMADA TARO が自動表示される
    await expect(page.getByText(FIXTURE.romaji, { exact: true })).toBeVisible();

    // B-8: 漢字氏名の入力欄が存在しないこと
    await expect(page.getByLabel(/漢字/)).toHaveCount(0);

    await page.getByLabel("住所", { exact: true }).fill(FIXTURE.address);
    await page.getByRole("button", { name: /次へ/ }).click();

    // ── Step 3: キャラ表示スタイル (男性=カゼマ) ────────────
    // B-10: 自分のタイプ (IL+) の男女キャラが並び、性別を聞かれない
    await expect(page.getByText(FIXTURE.charStyleMaleName)).toBeVisible();
    await expect(page.getByText(FIXTURE.charStyleFemaleName)).toBeVisible();
    await page
      .getByRole("button")
      .filter({ hasText: FIXTURE.charStyleMaleName })
      .click();

    // ── 登録実行 → /mytype 遷移 ────────────────────────────
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL(/\/mytype$/, { timeout: 15_000 });

    // ── §D マイタイプ基準値 ────────────────────────────────
    await expect(page.getByRole("heading", { name: "マイタイプ" })).toBeVisible();
    // D-3 ポテンシャル IL+ / カゼマ
    await expect(page.getByText(FIXTURE.expected.typeId, { exact: true })).toBeVisible();
    await expect(page.getByText(FIXTURE.charStyleMaleName)).toBeVisible();
    // D-2 星座
    await expect(page.getByText(FIXTURE.expected.zodiac)).toBeVisible();
    // D-4 気学
    await expect(page.getByText(FIXTURE.expected.honmei)).toBeVisible();
    await expect(page.getByText(new RegExp(`月命星:\\s*${FIXTURE.expected.getsumei}`))).toBeVisible();
    // D-5 ライフパス=5 / D-6 ディスティニー=9 (ラベルの次兄弟が cardValue)
    await expect(
      page.getByText("ライフパスナンバー", { exact: true }).locator("xpath=following-sibling::*[1]"),
    ).toHaveText(new RegExp(FIXTURE.expected.lifepath));
    await expect(
      page
        .getByText("ディスティニーナンバー", { exact: true })
        .locator("xpath=following-sibling::*[1]"),
    ).toHaveText(new RegExp(FIXTURE.expected.destiny));

    // D-7: 姓名判断セクションが表示されないこと (held)
    await expect(page.getByText(/姓名判断/)).toHaveCount(0);
    await expect(page.getByText(/五格/)).toHaveCount(0);

    await page.screenshot({ path: "e2e/screenshots/mytype.png", fullPage: true });
  });
});
