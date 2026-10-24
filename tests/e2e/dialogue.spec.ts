import { expect, test } from "@playwright/test";
import { correctOptionText, enterGame, teleport } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("a full conversation with Linh: words, choices, quiz, XP and notebook", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "covered on desktop; mobile shares the same overlay");
  await enterGame(page);
  // Walk into HR via the west door, then stand next to Linh (9,6) facing left.
  await teleport(page, 2, 9, "left");
  await page.keyboard.down("ArrowLeft");
  await page.waitForFunction(
    () => (window as unknown as { __dq: { mapKey: string } }).__dq.mapKey === "hr-room",
  );
  await page.keyboard.up("ArrowLeft");
  await page.waitForTimeout(300);
  await teleport(page, 10, 6, "left");
  await expect(page.getByText("[E] Talk to Linh")).toBeVisible();
  await page.keyboard.press("e");

  const dialog = page.getByRole("dialog", { name: /Linh/ });
  await expect(dialog).toContainText("onboarding");
  // Tap a highlighted word → popover → add to notebook.
  await dialog.getByRole("button", { name: "Bỏ qua" }).click();
  await dialog.getByRole("button", { name: "onboarding" }).click();
  const pop = page.getByRole("dialog", { name: "onboarding" });
  await expect(pop).toContainText("quá trình hội nhập nhân viên mới");
  await pop.getByRole("button", { name: /Thêm vào sổ tay/ }).click();
  await expect(page.getByText(/Đã thêm "onboarding"/)).toBeVisible();

  await page.keyboard.press("Enter"); // → choice
  await dialog.getByRole("button", { name: /^2Yes\.$/ }).click(); // poor answer
  await expect(dialog).toContainText("Chưa phù hợp");
  await dialog.getByRole("button", { name: /junior developer/ }).click();
  await expect(dialog).toContainText("Tuyệt vời!");
  await dialog.getByRole("button", { name: "Bỏ qua" }).click();
  const isNext = (r: { url: () => string }) => r.url().includes("/api/quiz/next");
  let nextResponse = page.waitForResponse(isNext);
  await page.keyboard.press("Enter"); // → quiz
  await page.screenshot({ path: test.info().outputPath("dialogue-quiz.png") });

  for (let i = 0; i < 3; i++) {
    const body = await (await nextResponse).json();
    if (!body?.data?.deliveryId) break;
    await page.waitForTimeout(900); // anti-bot latency floor
    const text = await correctOptionText(body.data.deliveryId);
    await page
      .getByTestId("quiz")
      .getByRole("button", {
        name: new RegExp(`^\\d${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      })
      .click();
    await expect(page.getByText("✓ Đúng rồi!")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`answer-${i}.png`) });
    // After the last question the session ends without another /next call: don't leave it dangling.
    nextResponse = page.waitForResponse(isNext);
    nextResponse.catch(() => {});
    await page.keyboard.press("Enter");
  }

  await expect(dialog).toContainText("Great job!");
  await dialog.getByRole("button", { name: "Bỏ qua" }).click();
  await page.keyboard.press("Enter");
  await expect(dialog).toContainText("Hoàn thành");
  await expect(dialog).toContainText("+20 XP");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  // HUD shows earned XP: 3×10 + session bonus + 20 dialogue.
  await expect(page.getByText(/Intern · L1|Intern · L2/)).toBeVisible();

  // Notebook (computer) lists the words learned in the conversation.
  await page.getByRole("button", { name: "Sổ tay" }).click();
  await expect(page.getByRole("dialog", { name: "Sổ tay từ vựng" })).toContainText("colleague");
});
