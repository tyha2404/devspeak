import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 393, height: 852 } });

for (const fontScale of ["m", "xl"] as const) {
  test(`iPhone layout stays within the viewport with ${fontScale} text`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript((fontScale) => {
      localStorage.setItem(
        "dq:settings",
        JSON.stringify({ state: { fontScale, theme: "light" }, version: 0 }),
      );
    }, fontScale);

    for (const route of ["/", "/grammar", "/vocab", "/profile", "/settings", "/lesson/1"]) {
      await page.goto(route);
      if (route.startsWith("/lesson/")) {
        await expect(page.getByRole("button", { name: "Tiếp tục →" })).toBeVisible({
          timeout: 30_000,
        });
      }
      await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("html")).toHaveCSS(
        "font-size",
        fontScale === "m" ? "18px" : "24px",
      );
      const dimensions = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(dimensions.document, `${route} must not scroll horizontally`).toBeLessThanOrEqual(
        dimensions.viewport + 1,
      );
      await page.screenshot({
        path: test.info().outputPath(`iphone-${fontScale}-${route.replaceAll("/", "_")}.png`),
        fullPage: true,
      });

      if (route === "/vocab") {
        // Topic cards can scroll inside their own rail without widening the page.
        const rail = page.getByRole("complementary", { name: "Chọn chủ đề" }).locator("ul");
        await rail.scrollIntoViewIfNeeded();
        await rail.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });
        await expect.poll(() => rail.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
        await expect(page.getByRole("button", { name: /^T25/ })).toBeInViewport();
      }
    }
  });
}
