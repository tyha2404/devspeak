import { expect, test, type BrowserContext } from "@playwright/test";
import { admin, enterGame, teleport } from "./helpers";

test.beforeEach(async ({ context }, info) => {
  test.skip(info.project.name === "mobile", "desktop flow");
  await context.clearCookies();
});

/** The guest's user id, read from the @supabase/ssr session cookie. */
async function userId(context: BrowserContext) {
  const parts = (await context.cookies())
    .filter((c) => c.name.includes("-auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const raw = parts.map((c) => c.value).join("");
  const json = Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString("utf8");
  return (JSON.parse(json) as { user: { id: string } }).user.id;
}

test("the elevator shows locked floors, and a Mid can visit the client", async ({
  page,
  context,
}) => {
  await enterGame(page);
  // Elevator doors are wall-mounted at tiles (24..25, 2) in the office.
  await teleport(page, 24, 3, "up");
  await expect(page.getByText("[E] Elevator")).toBeVisible();
  await page.keyboard.press("e");
  const lift = page.getByRole("dialog", { name: /Thang máy/ });
  await expect(lift.getByRole("button", { name: /Văn phòng khách hàng.*cần Mid/ })).toBeDisabled();
  await page.keyboard.press("Escape");

  // Promote this learner to Mid (server-side), reload, ride up.
  const id = await userId(context);
  // Mid starts at level 13 = 5,100 XP; one ledger event is capped at 5,000.
  for (const [amount, key] of [
    [5000, "e2e-mid-1"],
    [200, "e2e-mid-2"],
  ] as const) {
    await admin.rpc("svc_award_xp", {
      p_user: id,
      p_amount: amount,
      p_reason: "admin_adjust",
      p_key: key,
    });
  }
  await admin.rpc("svc_promote", { p_user: id, p_to: "junior" });
  await admin.rpc("svc_promote", { p_user: id, p_to: "mid" });
  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as { __dq?: { mapKey: string } }).__dq?.mapKey === "office-floor",
  );
  await teleport(page, 24, 3, "up");
  await expect(page.getByText("[E] Elevator")).toBeVisible();
  await page.keyboard.press("e");
  await page
    .getByRole("dialog", { name: /Thang máy/ })
    .getByRole("button", { name: /Văn phòng khách hàng/ })
    .click();
  await page.waitForFunction(
    () => (window as unknown as { __dq: { mapKey: string } }).__dq.mapKey === "client-office",
  );
  await expect(page.getByText("Văn phòng khách hàng")).toBeVisible();

  // Mike stands at (18,11) facing left; talk to him from the right.
  await teleport(page, 19, 11, "left");
  await expect(page.getByText("[E] Talk to Mike Johnson")).toBeVisible();
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog", { name: /Mike/ })).toContainText("requirement");
  await page.screenshot({ path: test.info().outputPath("mike.png") });
});

test("NPC schedules: Tuấn eats lunch in the pantry", async ({ page }) => {
  await page.goto("/play?e2e=1&clock=12:00");
  await page.waitForFunction(
    () => (window as unknown as { __dq?: { mapKey: string } }).__dq?.mapKey === "office-floor",
  );
  expect(
    await page.evaluate(() =>
      (window as unknown as { __dq: { npcs: () => string[] } }).__dq.npcs(),
    ),
  ).not.toContain("tuan");
  await page.goto("/play?e2e=1&clock=09:00");
  await page.waitForFunction(
    () => (window as unknown as { __dq?: { mapKey: string } }).__dq?.mapKey === "office-floor",
  );
  expect(
    await page.evaluate(() =>
      (window as unknown as { __dq: { npcs: () => string[] } }).__dq.npcs(),
    ),
  ).toContain("tuan");
});

test("Junior → Mid promotion runs the architecture-review boss scene", async ({
  page,
  context,
}) => {
  await enterGame(page);
  const id = await userId(context);
  for (const [amount, key] of [
    [5000, "e2e-boss-1"],
    [200, "e2e-boss-2"],
  ] as const) {
    await admin.rpc("svc_award_xp", {
      p_user: id,
      p_amount: amount,
      p_reason: "admin_adjust",
      p_key: key,
    });
  }
  await admin.rpc("svc_promote", { p_user: id, p_to: "junior" });
  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as { __dq?: { mapKey: string } }).__dq?.mapKey === "office-floor",
  );
  // HR room: west door, then the interview desk (tiles 5..7, 5..6).
  await teleport(page, 2, 9, "left");
  await page.keyboard.down("ArrowLeft");
  await page.waitForFunction(
    () => (window as unknown as { __dq: { mapKey: string } }).__dq.mapKey === "hr-room",
  );
  await page.keyboard.up("ArrowLeft");
  await page.waitForTimeout(300);
  await teleport(page, 6, 7, "up");
  await expect(page.getByText("[E] Promotion Review")).toBeVisible();
  await page.keyboard.press("e");
  const panel = page.getByRole("dialog", { name: /Promotion Review/ });
  await expect(panel).toContainText("Buổi review kiến trúc với Raj");
  await panel.getByRole("button", { name: /Bắt đầu/ }).click();
  await expect(panel.getByText("Whiteboard · system design")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("boss-architecture.png") });
});
