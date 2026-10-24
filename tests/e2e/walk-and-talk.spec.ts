import { expect, test, type Page } from "@playwright/test";

type Dq = {
  mapKey: string;
  teleport: (x: number, y: number, facing?: string) => void;
  player: () => { x: number; y: number };
  npcs: () => string[];
};

async function enterOffice(page: Page) {
  await page.goto("/play?e2e=1");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __dq?: Dq }).__dq?.mapKey === "office-floor",
  );
}

const teleport = (page: Page, x: number, y: number, facing: string) =>
  page.evaluate(([x, y, f]) => (window as unknown as { __dq: Dq }).__dq.teleport(x, y, f), [
    x,
    y,
    facing,
  ] as const);

/** Desktop shows an "[E] …" hint and uses the E key; touch devices use the action button. */
function actionHint(page: Page, label: RegExp, mobile: boolean) {
  return mobile ? page.getByRole("button", { name: label }) : page.getByText(label);
}
async function interact(page: Page, label: RegExp, mobile: boolean) {
  if (mobile) await page.getByRole("button", { name: label }).tap();
  else await page.keyboard.press("e");
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("landing links to the game", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Chơi ngay" })).toHaveAttribute("href", "/play");
});

test("talk to an NPC; the dialogue locks movement until closed", async ({ page, isMobile }) => {
  await enterOffice(page);
  // Tuấn stands at tile (13,9); stand just below him facing up.
  await teleport(page, 13, 10, "up");
  await expect(actionHint(page, /Talk to Tuấn/, isMobile)).toBeVisible();
  await interact(page, /Talk to Tuấn/, isMobile);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("pull before you push");
  await page.screenshot({ path: test.info().outputPath("dialogue.png") });

  const before = await page.evaluate(() => (window as unknown as { __dq: Dq }).__dq.player());
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(300);
  await page.keyboard.up("ArrowLeft");
  const after = await page.evaluate(() => (window as unknown as { __dq: Dq }).__dq.player());
  expect(after.x).toBe(before.x);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("doors move between rooms and the position survives a reload", async ({ page }) => {
  await enterOffice(page);
  await page.screenshot({ path: test.info().outputPath("office.png") });
  // West door to HR is at tiles (0,12..13).
  await teleport(page, 2, 12, "left");
  await page.keyboard.down("ArrowLeft");
  await page.waitForFunction(() => (window as unknown as { __dq: Dq }).__dq.mapKey === "hr-room");
  await page.keyboard.up("ArrowLeft");
  await expect(page.getByText("Phòng nhân sự")).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: test.info().outputPath("hr-room.png") });

  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __dq?: Dq }).__dq?.mapKey === "hr-room");
  await expect(page.getByText("Phòng nhân sự")).toBeVisible();

  // Same account, no local state (another device): the server copy wins.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __dq?: Dq }).__dq?.mapKey === "hr-room");
});

test("locked doors explain what they need", async ({ page, isMobile }) => {
  await enterOffice(page);
  // Server room door (rank: Junior) is at tiles (19..20, 25).
  await teleport(page, 19, 24, "down");
  await expect(actionHint(page, /Locked · cần Junior/, isMobile)).toBeVisible();
  await interact(page, /Locked · cần Junior/, isMobile);
  await expect(page.getByText(/Phòng server: cần cấp Junior/)).toBeVisible();
});

test("only unlocked NPCs appear for a new Intern", async ({ page }) => {
  await enterOffice(page);
  const npcs = await page.evaluate(() => (window as unknown as { __dq: Dq }).__dq.npcs());
  expect(npcs).toContain("tuan");
  expect(npcs).not.toContain("emma"); // unlocks at level 3
});
