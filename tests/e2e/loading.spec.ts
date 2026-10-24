import { expect, test } from "@playwright/test";

test("shows a stable loading state, respects reduced motion and retries a failed load", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/home", async (route) => {
    requests++;
    if (requests === 1) {
      await pending;
      await route.fulfill({
        status: 503,
        json: { ok: false, error: { code: "INTERNAL", message: "Unavailable" } },
      });
    } else await route.continue();
  });
  try {
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Nội dung đang được chuẩn bị" })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Đang tải");
    await expect(page.locator(".dq-skeleton").first()).toHaveCSS("animation-name", "none");
    await expect(page.locator(".dq-spin")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: test.info().outputPath("loading.png"), fullPage: true });
    release();
    await expect(
      page.getByRole("heading", { name: "Chưa tải được dữ liệu học tập" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Học theo từng chặng");
    expect(requests).toBe(2);
  } finally {
    release();
  }
});

test("locks the login form while submitting and restores it after an error", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    requests++;
    await pending;
    await route.fulfill({
      status: 400,
      json: { code: "invalid_credentials", msg: "Invalid login credentials" },
    });
  });
  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill("loading@test.dev");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("button", { name: "Đang đăng nhập…" })).toBeDisabled();
    await expect(page.getByLabel("Email")).toBeDisabled();
    await expect(page.getByRole("tab", { name: "Đăng ký" })).toBeDisabled();
    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
    await page.screenshot({ path: test.info().outputPath("login-pending.png"), fullPage: true });
    release();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Email hoặc mật khẩu không đúng.",
    );
    await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeEnabled();
    await expect(page.getByLabel("Email")).toBeEnabled();
    expect(requests).toBe(1);
  } finally {
    release();
  }
});
