import { expect, test } from "@playwright/test";

for (const { theme, system, expected } of [
  { theme: "light", system: "dark", expected: "light" },
  { theme: "dark", system: "light", expected: "dark" },
  { theme: "system", system: "dark", expected: "dark" },
] as const) {
  test(`saved ${theme} theme applies before hydration on a ${system} system`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: system });
    await page.addInitScript((theme) => {
      localStorage.setItem("dq:settings", JSON.stringify({ state: { theme }, version: 0 }));
    }, theme);
    // Prevent hydration: the document must already have the right colors without React.
    await page.route("**/_next/**/*.js*", (route) => route.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveCSS("color-scheme", expected);
  });
}

test("hydration and reload keep the saved light theme on a dark system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("dq:settings", JSON.stringify({ state: { theme: "light" }, version: 0 }));
    const themes: (string | undefined)[] = [];
    Object.assign(window, { observedThemes: themes });
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.attributeName === "data-theme") {
          themes.push(document.documentElement.dataset.theme);
        }
      }
    }).observe(document, { attributes: true, subtree: true });
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 0) await page.goto("/");
    else await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // A hydrated client component confirms SettingsEffect has also had time to run.
    await page.getByRole("link", { name: "Lộ trình", exact: true }).click();
    await expect(page).toHaveURL(/\/grammar$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const themes = await page.evaluate(
      () => (window as unknown as { observedThemes: (string | undefined)[] }).observedThemes,
    );
    expect(themes.length).toBeGreaterThan(0);
    expect(themes.every((theme) => theme === "light")).toBe(true);
  }
});
