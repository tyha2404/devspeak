import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { admin, teleport } from "./helpers";

type Dq = { mapKey: string; player: () => { x: number; y: number } };
const player = (page: Page) =>
  page.evaluate(() => (window as unknown as { __dq: Dq }).__dq.player());

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name === "mobile", "keyboard flow");
  await context.clearCookies();
});

async function userId(context: BrowserContext) {
  const raw = (await context.cookies())
    .filter((c) => c.name.includes("-auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
  return (
    JSON.parse(Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString("utf8")) as {
      user: { id: string };
    }
  ).user.id;
}

test("a panel opened before the game booted still locks movement", async ({ page }) => {
  await page.goto("/play?e2e=1&placement=1");
  await expect(page.getByRole("dialog", { name: /Chào mừng/ })).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as { __dq?: Dq }).__dq);
  const before = await player(page);
  await page.keyboard.down("d");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.keyboard.up("ArrowRight");
  expect(await player(page)).toEqual(before);
});

test("typing W/A/S/D into an answer box types text and never moves the player", async ({
  page,
  context,
}) => {
  await page.goto("/play?e2e=1");
  await page.waitForFunction(
    () => (window as unknown as { __dq?: Dq }).__dq?.mapKey === "office-floor",
  );
  // Jump to Sarah's speaking standup (mark her first two conversations done).
  const id = await userId(context);
  const { data: ds } = await admin
    .from("dialogues")
    .select("id, version, slug")
    .eq("npc_id", "sarah")
    .order("sort_order");
  for (const d of ds!.filter((x) => x.slug !== "sarah-speaking-standup")) {
    await admin.from("dialogue_runs").insert({
      user_id: id,
      dialogue_id: d.id,
      dialogue_version: d.version,
      current_node: "end",
      completed_at: new Date().toISOString(),
    });
  }
  // Meeting room via the east door, Sarah stands at (8,3).
  await teleport(page, 27, 6, "right");
  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(
    () => (window as unknown as { __dq: Dq }).__dq.mapKey === "meeting-room",
  );
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(300);
  await teleport(page, 8, 4, "up");
  await expect(page.getByText("[E] Talk to Sarah Chen")).toBeVisible();
  await page.keyboard.press("e");
  const dialog = page.getByRole("dialog", { name: /Sarah/ });
  await dialog.getByRole("button", { name: "Bỏ qua" }).click();
  await page.keyboard.press("Enter");

  const typeInstead = dialog.getByRole("button", { name: /Gõ thay/ });
  if (await typeInstead.isVisible()) await typeInstead.click();
  const box = dialog.getByRole("textbox", { name: /Gõ câu nói/ });
  await box.click();
  const before = await player(page);
  const text = "Yesterday I fixed a bug. Today I will work on tests. No blockers. wasd WASD";
  await page.keyboard.type(text, { delay: 15 });
  await expect(box).toHaveValue(text);
  expect(await player(page)).toEqual(before);
  await dialog.getByRole("button", { name: "Gửi" }).click();
  await expect(dialog).toContainText("Tuyệt vời!");
});
