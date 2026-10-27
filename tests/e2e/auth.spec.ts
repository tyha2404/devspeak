import { expect, test } from "@playwright/test";
import { admin, correctOptionText, startOnHome } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

/** Finish the first vocabulary lesson as the current user (all answers right). */
async function finishFirstWordSet(page: import("@playwright/test").Page) {
  const deliveries: { deliveryId?: string; done?: boolean }[] = [];
  page.on("response", async (r) => {
    if (r.url().includes("/api/quiz/next"))
      deliveries.push((await r.json().catch(() => ({}))).data ?? {});
  });
  await page.goto("/vocab");
  await page.getByRole("button", { name: /Bài từ vựng 01/ }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Bắt đầu học →" }).click();
  await expect(page.getByText("0/10", { exact: true })).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Đã nhớ" }).click({ timeout: 5000 });
    if (i < 9) await expect(page.getByText(`${i + 1}/10`, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Làm bài kiểm tra →" }).click();
  const quiz = page.getByTestId("quiz");
  for (let n = 1; n <= 16; n++) {
    await expect.poll(() => deliveries.length >= n).toBeTruthy();
    const right = await correctOptionText(deliveries[n - 1]!.deliveryId!);
    const box = quiz.getByRole("textbox");
    if (await box.count()) {
      await box.fill(right);
      await box.press("Enter");
    } else {
      const option = quiz.getByRole("button", {
        name: new RegExp(`^[A-D] ${right.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      });
      await option.click({ timeout: 5000 });
    }
    const next = quiz.getByRole("button", { name: /Câu tiếp theo|Xem kết quả/ });
    await expect(next).toBeEnabled();
    await next.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByText("Đã qua màn")).toBeVisible();
}

test("a guest signs up, keeps their progress, signs out and back in", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `learner-${crypto.randomUUID()}@test.dev`;
  const password = "secret-123";

  await startOnHome(page);
  await expect(page.getByRole("link", { name: "Đăng nhập" }).first()).toBeVisible();
  await finishFirstWordSet(page);

  await page.goto("/login?mode=signup&next=/profile");
  await expect(page.getByText("Tiến độ bạn đã học với tư cách khách")).toBeVisible();
  await page.getByLabel("Tên hiển thị").fill("Minh");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();

  await page.waitForURL("**/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Minh" })).toBeVisible();
  await expect(page.getByRole("main").getByText(email)).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible(); // answers came along: accuracy
  await expect(page.getByText("80", { exact: true })).toBeVisible(); // the guest's XP came along
  await expect(page.getByText("1/10 bài")).toBeVisible(); // T01 progress in the detail table
  await page.screenshot({ path: test.info().outputPath("profile.png"), fullPage: true });

  // The guest account was merged away.
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const me = users.users.find((u) => u.email === email)!;
  const { data: profile } = await admin
    .from("profiles")
    .select("xp_total")
    .eq("id", me.id)
    .single();
  expect(profile!.xp_total).toBe(80);

  // Account actions live on the settings page, reached from the account menu.
  await page.locator("summary").click();
  await page.getByRole("link", { name: "Cài đặt →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cài đặt" })).toBeVisible();
  await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Minh");
  await page.getByRole("main").getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.goto("/login?next=/profile");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
  await expect(page.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
  await page.waitForURL("**/profile");
  await expect(page.getByText("1/10 bài")).toBeVisible();
});

test("a recovery link opens the password form and the new password works", async ({ page }) => {
  const email = `recovery-${crypto.randomUUID()}@test.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "old-secret-123",
    email_confirm: true,
  });
  expect(error).toBeNull();
  try {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    expect(linkError).toBeNull();
    await page.goto(`/auth/confirm?type=recovery&token_hash=${link.properties!.hashed_token}`);
    await page.waitForURL("**/account/password");
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill("new-secret-123");
    await page.getByLabel("Nhập lại mật khẩu").fill("different-password");
    await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Hai mật khẩu chưa khớp.");
    await page.getByLabel("Nhập lại mật khẩu").fill("new-secret-123");
    await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
    await expect(page.getByText("Đã lưu mật khẩu mới.")).toBeVisible();
    await page.getByRole("link", { name: "Về cài đặt" }).click();
    await page.getByRole("main").getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/login?next=/profile");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("new-secret-123");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).last().click();
    await page.waitForURL("**/profile");
    await expect(page.getByRole("main").getByText(email)).toBeVisible();
  } finally {
    await admin.auth.admin.deleteUser(data.user!.id);
  }
});

test("expired links and guest password changes show a recovery action", async ({ page }) => {
  await page.goto("/auth/callback?code=expired");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Link đã hết hạn hoặc không hợp lệ",
  );
  await page.goto("/account/password");
  await expect(page.getByRole("link", { name: "Về trang đăng nhập" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu mật khẩu" })).toHaveCount(0);
});
