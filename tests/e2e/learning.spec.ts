import { expect, test } from "@playwright/test";
import { admin, answerQuiz, lessonId, markDone, startAsGuest, userId } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("career path: onboarding → today's first lesson", async ({ page }) => {
  await page.goto("/career");
  await page.waitForURL("**/onboarding");
  await expect(page.getByRole("heading", { name: "Bạn học tiếng Anh để làm gì?" })).toBeVisible();
  await page.getByRole("button", { name: /Chuẩn bị phỏng vấn/ }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: /Nghiêm túc/ }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: /Học từ đầu/ }).click();
  await page.waitForURL("**/career");
  await expect(
    page.getByRole("heading", { name: "Giới thiệu bản thân & onboarding" }),
  ).toBeVisible();
  await expect(page.getByText("0/30 XP").filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("home.png"), fullPage: true });
});

test("old URLs redirect to the new routes", async ({ page }) => {
  for (const [from, to] of [
    ["/tracks", "/"],
    ["/tracks/grammar", "/grammar"],
    ["/learn", "/career"],
    ["/path", "/career/path"],
  ]) {
    const res = await page.request.get(from!, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(new URL(res.headers().location!, "http://x").pathname).toBe(to);
  }
});

test("a vocabulary lesson: words, quick check, stars, and the next lesson opens", async ({
  page,
}) => {
  await startAsGuest(page);
  await page.getByRole("link", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Từ 1/4")).toBeVisible();
  await answerQuiz(page, async () => {
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: /Xem nghĩa/ }).click();
      await page.getByRole("button", { name: /Từ tiếp theo|Kiểm tra nhanh/ }).click();
    }
  });
  await expect(page.getByRole("heading", { name: "Hoàn thành bài học" })).toBeVisible();
  await expect(page.getByText("+15 XP")).toBeVisible();
  await expect(page.getByLabel("3/3 sao")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("result.png") });

  await page.getByRole("link", { name: /Tiếp: Chào mừng gia nhập/ }).click();
  await expect(page.getByText("Linh", { exact: true })).toBeVisible();

  // Progress lives on the server: the unit page shows it after a reload.
  await page.goto("/career/path/introduce-yourself");
  await expect(page.getByLabel("3/3 sao")).toBeVisible();
  await expect(page.getByRole("link", { name: "Học tiếp" })).toHaveAttribute(
    "href",
    `/lesson/${await lessonId("s1-welcome")}`,
  );
});

test("a locked lesson can't be opened by URL", async ({ page }) => {
  await startAsGuest(page);
  await page.goto(`/lesson/${await lessonId("s1-task")}`);
  await expect(page.getByText("Finish the previous lesson first")).toBeVisible();
});

test("the unit task is graded and finishing it completes the unit", async ({ page, context }) => {
  await startAsGuest(page);
  await markDone(await userId(context), [
    "s1-words",
    "s1-welcome",
    "s1-focus",
    "s1-practice",
    "s1-mistakes",
  ]);
  await page.goto(`/lesson/${await lessonId("s1-task")}`);
  const box = page.getByRole("textbox", { name: "Câu trả lời" });
  // Typing digits and letters must never trigger a shortcut in the page.
  await box.pressSequentially("Hi everyone 1234! I'm Nam, a backend developer. ");
  await box.pressSequentially(
    "I work with Go on the payments team. Looking forward to working with you, thanks!",
  );
  await expect(box).toHaveValue(/^Hi everyone 1234! I'm Nam/);
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByText("Câu trả lời mẫu")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("task.png"), fullPage: true });
  await page.getByRole("button", { name: "Hoàn thành bài" }).click();
  await expect(page.getByRole("heading", { name: /Xong unit S1/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tiếp:/ })).toBeVisible();
});

test("words learned in a lesson come back in review", async ({ page, context }) => {
  await startAsGuest(page);
  await page.getByRole("link", { name: "Bắt đầu" }).click();
  await expect(page.getByText("Từ 1/4")).toBeVisible(); // starting the lesson adds the cards
  const user = await userId(context);
  await admin
    .from("user_cards")
    .update({ due: new Date(Date.now() - 1000).toISOString() })
    .eq("user_id", user);
  await page.goto("/review");
  await expect(page.getByText(/Từ 1\/4/)).toBeVisible();
  await page.goto("/words");
  await expect(page.getByText("introduce yourself")).toBeVisible();
});

test("the path shows every stage, with drafts marked coming soon", async ({ page }) => {
  await startAsGuest(page);
  await page.goto("/career/path");
  await expect(page.getByRole("heading", { name: /Chặng 1 · Nền tảng/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Chặng 4/ })).toBeVisible();
  await expect(page.getByText("Sắp ra mắt").first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("path.png"), fullPage: true });
});

test("phones get a bottom tab bar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile layout");
  await startAsGuest(page);
  const nav = page.getByRole("navigation", { name: "Chính" }).last();
  await nav.getByRole("link", { name: "Tình huống" }).click();
  await expect(page).toHaveURL(/\/career\/practice/);
  await nav.getByRole("link", { name: "Ôn tập" }).click();
  await expect(page).toHaveURL(/\/review/);
  // Review and profile belong to the grammar & vocabulary area: top bar with an account menu.
  await page.locator("summary").click();
  await page.getByRole("link", { name: "Trang cá nhân →" }).click();
  await expect(page.getByRole("heading", { name: "Mục tiêu hằng ngày" })).toBeVisible();
});
