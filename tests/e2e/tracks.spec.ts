import { expect, test, type Page } from "@playwright/test";
import { correctOptionText, startOnHome } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Answers a study-track test through the real UI: right answers from the server-only key,
 * except question numbers in `wrong` (answered wrongly) and `timeout` (left to run out).
 */
async function answerTrackQuiz(
  page: Page,
  trigger: () => Promise<unknown>,
  { wrong = [], timeout = [] }: { wrong?: number[]; timeout?: number[] } = {},
) {
  const deliveries = new Map<number, { deliveryId?: string; done?: boolean }>();
  const onResponse = async (r: import("@playwright/test").Response) => {
    try {
      if (r.url().includes("/api/quiz/next")) {
        const delivery = (await r.json()).data;
        // Track the displayed question number; Strict Mode can repeat requests for one index.
        if (delivery.index) deliveries.set(delivery.index, delivery);
      }
    } catch {
      // navigation raced the body read
    }
  };
  page.on("response", onResponse);
  try {
    await trigger();
    const quiz = page.getByTestId("quiz");
    for (let n = 1; n <= 20; n++) {
      await expect.poll(() => deliveries.has(n), { timeout: 15_000 }).toBeTruthy();
      const d = deliveries.get(n)!;
      if (d.done) return;
      if (timeout.includes(n)) {
        await expect(quiz.getByText("Hết giờ.")).toBeVisible({ timeout: 40_000 });
      } else {
        const right = await correctOptionText(d.deliveryId!);
        const box = quiz.getByRole("textbox");
        if (await box.count()) {
          await box.fill(wrong.includes(n) ? "zzz" : right);
          await quiz.getByRole("button", { name: "Kiểm tra", exact: true }).click();
        } else {
          const exact = new RegExp(`^[A-D] ${escapeRe(right)}$`);
          const target = wrong.includes(n)
            ? quiz
                .getByRole("button", { name: /^[A-D] / })
                .filter({ hasNotText: new RegExp(`${escapeRe(right)}$`) })
                .first()
            : quiz.getByRole("button", { name: exact });
          await target.click();
        }
        await expect(quiz.getByText(wrong.includes(n) ? "Chưa đúng." : "Chính xác.")).toBeVisible();
      }
      const next = quiz.getByRole("button", { name: /Câu tiếp theo|Xem kết quả/ });
      const last = (await next.textContent())?.includes("Xem kết quả");
      await next.click();
      if (last) return;
    }
  } finally {
    page.off("response", onResponse);
  }
}

test("grammar track: lesson info → five study screens → timed test → stars, XP and history", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Guests land on the home page directly; there is no onboarding for this area.
  await startOnHome(page);
  await expect(page).toHaveURL(/\/$/);
  await page.screenshot({ path: test.info().outputPath("tracks-home.png"), fullPage: true });

  await page.goto("/grammar");
  await expect(page.getByRole("heading", { level: 1, name: "Ngữ pháp A1" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^A2 Ngữ pháp A2/ })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath("grammar-track.png"), fullPage: true });
  await page.getByRole("button", { name: /To be & subject pronouns/ }).click();
  const dialog = page.getByRole("dialog", { name: "To be & subject pronouns" });
  await expect(dialog.getByText("Chưa làm bài.")).toBeVisible();
  await dialog.getByRole("link", { name: "Bắt đầu học →" }).click();

  await expect(page.getByRole("button", { name: "Tiếp tục →" })).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Tiếp tục →" }).click();
  await expect(page.getByRole("heading", { name: "Bài kiểm tra ngữ pháp" })).toBeVisible();
  await expect(page.getByText("20 giây/câu chọn · 30 giây/câu điền từ.")).toBeVisible();

  await answerTrackQuiz(page, async () => {
    await page.getByRole("button", { name: "Làm bài kiểm tra →" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("question.png") });
  });
  await expect(page.getByText("Đã qua màn")).toBeVisible();
  await expect(page.getByLabel("3/3 sao")).toBeVisible();
  await expect(page.getByText("+80")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("result.png"), fullPage: true });

  const nextLesson = page.getByRole("link", { name: /^Bài tiếp:/ });
  const nextLessonHref = await nextLesson.getAttribute("href");
  await nextLesson.click();
  await expect(page).toHaveURL(new RegExp(`${nextLessonHref}$`));
  await expect(page.getByRole("button", { name: "Tiếp tục →" })).toBeVisible({ timeout: 20_000 });

  await page.goto("/grammar");
  await page.getByRole("button", { name: /To be & subject pronouns/ }).click();
  await expect(page.getByRole("dialog").getByText("Kết quả gần nhất")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("100%").first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("lesson-info.png") });
  await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByRole("button", { name: /Object pronouns/ })).toBeEnabled();
});

test("vocabulary track: rate cards, a question times out, the test still finishes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startOnHome(page);
  await page.goto("/vocab");
  for (const topic of [/^T01/, /^T02/, /^T03/])
    await expect(page.getByRole("button", { name: topic })).toBeEnabled();
  await page.getByRole("button", { name: "Xem toàn bộ thẻ →" }).click();
  await expect(page.getByRole("dialog").getByText("200 mục từ")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Bài từ vựng 01/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Bắt đầu học →" }).click();
  await expect(page.getByText("0/10", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Đã nhớ" })).toBeDisabled();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Cần ôn" }).click();
  await expect(page.getByText("1 thẻ đang chờ ôn lại")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("cards.png") });
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Đã nhớ" }).click();
  }
  await expect(page.getByRole("heading", { name: "Bài kiểm tra từ vựng" })).toBeVisible();

  await answerTrackQuiz(
    page,
    () => page.getByRole("button", { name: "Làm bài kiểm tra →" }).click(),
    { timeout: [1] },
  );
  // 15/16 = 93.75%: a pass with 2 stars.
  await expect(page.getByText("Đã qua màn")).toBeVisible();
  await expect(page.getByLabel("2/3 sao")).toBeVisible();
  await expect(page.getByText("15/16")).toBeVisible();
});

test("grammar test-out: 80% opens the whole next level and pays 120 XP", async ({ page }) => {
  await startOnHome(page);
  await page.goto("/grammar");
  await page.getByRole("link", { name: "Làm bài vượt cấp →" }).click();
  await expect(page.getByText("Bài kiểm tra vượt cấp")).toBeVisible({ timeout: 20_000 });
  await answerTrackQuiz(page, () =>
    page.getByRole("button", { name: "Làm bài kiểm tra →" }).click(),
  );
  await expect(page.getByText("Bậc tiếp theo đã mở.")).toBeVisible();
  await expect(page.getByText("+120")).toBeVisible();

  await page.goto("/grammar");
  await page.getByRole("button", { name: /^A2 Ngữ pháp A2/ }).click();
  await expect(page.getByRole("button", { name: /Past simple/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Comparatives/ })).toBeEnabled();
});

test("old URLs redirect to the new routes", async ({ page }) => {
  for (const [from, to] of [
    ["/tracks", "/"],
    ["/tracks/grammar", "/grammar"],
    ["/exam/test-out/1", "/test-out/1"],
    ["/learn", "/"],
    ["/career/path", "/"],
    ["/onboarding", "/"],
  ]) {
    const res = await page.request.get(from!, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(new URL(res.headers().location!, "http://x").pathname).toBe(to);
  }
});
