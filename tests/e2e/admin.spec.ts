import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { admin } from "./helpers";

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "mobile", "admin is desktop-only");
});

/** Sign a real editor in and hand the browser the same session cookie @supabase/ssr would set. */
async function signInAsEditor(context: import("@playwright/test").BrowserContext) {
  const email = `editor-${crypto.randomUUID()}@test.dev`;
  const password = `Pw-${crypto.randomUUID()}`;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  await admin.from("user_roles").insert({ user_id: created.user!.id, role: "editor" });
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
  const { data } = await anon.auth.signInWithPassword({ email, password });
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  await context.addCookies([
    {
      name: `sb-${ref}-auth-token`,
      value: `base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}`,
      domain: "localhost",
      path: "/",
    },
  ]);
}

test("guests are kept out of /admin", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("an editor approves an AI question and it becomes servable", async ({ page, context }) => {
  // Make sure there is something to review.
  const { data: q } = await admin
    .from("questions")
    .select("id, slug")
    .eq("status", "published")
    .eq("origin", "human")
    .limit(1)
    .single();
  await admin.from("questions").update({ status: "in_review" }).eq("id", q!.id);

  await signInAsEditor(context);
  await page.goto(`/admin/moderation?status=in_review&q=${q!.slug}`);
  await expect(page.getByRole("heading", { name: "Duyệt câu hỏi" })).toBeVisible();
  const card = page.locator("article", { hasText: q!.slug });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Duyệt", exact: true }).click();
  await expect(page.locator("article", { hasText: q!.slug })).toHaveCount(0);
  const { data: after } = await admin.from("questions").select("status").eq("id", q!.id).single();
  expect(after!.status).toBe("published");
  const { data: log } = await admin
    .from("moderation_actions")
    .select("action")
    .eq("entity_id", q!.id);
  expect(log!.map((l) => l.action)).toContain("approve");

  await page.goto("/admin/usage");
  await expect(page.getByRole("heading", { name: "Chi phí Claude API" })).toBeVisible();
});
