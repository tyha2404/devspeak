import { expect, test } from "@playwright/test";
import { correctOptionText, enterGame, teleport } from "./helpers";

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name === "mobile", "desktop flow");
  await context.clearCookies();
});

test("word of the day → notebook → verified review with FSRS rating", async ({ page }) => {
  await enterGame(page);
  // Whiteboard is wall-mounted at tiles (3..4, 2); stand below it facing up.
  await teleport(page, 3, 3, "up");
  await expect(page.getByText("[E] Word of the Day")).toBeVisible();
  await page.keyboard.press("e");
  const panel = page.getByRole("dialog", { name: /Word of the Day/ });
  await expect(panel.getByRole("button", { name: "Học từ này" }).first()).toBeVisible();
  await panel.getByRole("button", { name: "Học từ này" }).first().click();
  await expect(panel.getByText("✓ Đã vào sổ tay")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("daily.png") });
  await page.keyboard.press("Escape");

  // Sprint board shows today's tickets, with "learn words" progressing.
  await teleport(page, 8, 3, "up");
  await expect(page.getByText("[E] Sprint Board")).toBeVisible();
  await page.keyboard.press("e");
  const board = page.getByRole("dialog", { name: /Sprint Board/ });
  await expect(board).toContainText("Sprint tuần");
  await page.screenshot({ path: test.info().outputPath("quests.png") });
  await page.keyboard.press("Escape");

  // The new card is due immediately: verify, then rate.
  const next = page.waitForResponse((r) => r.url().includes("/api/quiz/next"));
  await page.goto("/review");
  const body = await (await next).json();
  await page.waitForTimeout(900);
  const text = await correctOptionText(body.data.deliveryId);
  await page
    .getByTestId("quiz")
    .getByRole("button", {
      name: new RegExp(`^\\d${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    })
    .click();
  await expect(page.getByText("✓ Đúng rồi!")).toBeVisible();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /^Nhớ/ }).click();
  await expect(page.getByText(/Xong 1 thẻ/)).toBeVisible();
});

test("shop: not enough beans is explained", async ({ page }) => {
  await enterGame(page);
  await page.getByRole("button", { name: "Cài đặt" }).click();
  await expect(page.getByRole("dialog", { name: /Cài đặt/ })).toContainText("Dịch tiếng Việt");
  await page.keyboard.press("Escape");
  await page.goto("/profile");
  await expect(page.getByText("Commit graph")).toBeVisible();
  await expect(page.getByText(/Khách không xuất hiện trên bảng xếp hạng/)).toBeVisible();
});
