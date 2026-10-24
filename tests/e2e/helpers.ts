import { createClient } from "@supabase/supabase-js";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // CI exports env directly
}

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: { persistSession: false },
  },
);

/** A brand-new guest on the career path: /career → onboarding (default goal) → "start from the beginning". */
export async function startAsGuest(page: Page) {
  await page.goto("/career");
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: /Học từ đầu/ }).click();
  await page.waitForURL("**/career");
}

/** A brand-new guest on the grammar & vocabulary home: no onboarding, straight in. */
export async function startOnHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Học theo từng chặng");
}

/** The guest's user id, read from the @supabase/ssr session cookie. */
export async function userId(context: BrowserContext) {
  const parts = (await context.cookies())
    .filter((c) => c.name.includes("-auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const raw = parts.map((c) => c.value).join("");
  const json = Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString("utf8");
  return (JSON.parse(json) as { user: { id: string } }).user.id;
}

export const lessonId = async (slug: string) =>
  (await admin.from("lessons").select("id").eq("slug", slug).single()).data!.id as number;

/** Mark lessons done server-side (fixtures for later steps; the real flow is tested separately). */
export async function markDone(user: string, slugs: string[]) {
  for (const slug of slugs)
    await admin.from("user_lesson_progress").insert({
      user_id: user,
      lesson_id: await lessonId(slug),
      stars: 3,
      best_pct: 100,
      attempts: 1,
      completed_at: new Date().toISOString(),
    });
}

interface Delivery {
  deliveryId?: string;
  done?: boolean;
  prompt?: { options?: { id: string; text: string }[] };
}

/**
 * Answers every question of the quiz that `trigger` opens, correctly, through the real UI.
 * The answer comes from the server-only key (test oracle) for the delivery the page received.
 */
export async function answerQuiz(page: Page, trigger: () => Promise<unknown>) {
  let latest: Delivery | null = null;
  let finished = false;
  const onResponse = async (r: import("@playwright/test").Response) => {
    try {
      if (r.url().includes("/api/quiz/next")) latest = (await r.json()).data;
      if (r.url().includes("/api/quiz/answer")) finished = !!(await r.json()).data?.session?.done;
    } catch {
      // navigation raced the body read
    }
  };
  page.on("response", onResponse);
  try {
    await trigger();
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await expect
        .poll(() => latest && (latest.done || !seen.has(latest.deliveryId!)), { timeout: 15_000 })
        .toBeTruthy();
      const d = latest as unknown as Delivery;
      if (d.done) return;
      seen.add(d.deliveryId!);
      const text = await correctOptionText(d.deliveryId!);
      const quiz = page.getByTestId("quiz");
      if (d.prompt?.options) {
        await quiz.getByRole("button", { name: text }).first().click();
      } else {
        await quiz.getByRole("textbox").fill(text);
        await quiz.getByRole("textbox").press("Enter");
      }
      await quiz.getByRole("button", { name: /^Tiếp/ }).click();
      if (finished) return;
    }
  } finally {
    page.off("response", onResponse);
  }
}

/** Reads the server-only answer key for a delivery (test oracle; never available to the client). */
export async function correctOptionText(deliveryId: string): Promise<string> {
  const { data } = await admin
    .from("question_deliveries")
    .select("option_map, client_prompt, question_versions(answer)")
    .eq("id", deliveryId)
    .single();
  const map = data!.option_map as Record<string, string>;
  const answer = (
    data!.question_versions as unknown as {
      answer: { kind: string; correct?: string; accepted?: string[] };
    }
  ).answer;
  if (answer.kind === "text") return answer.accepted![0]!;
  const opaque = Object.entries(map).find(([, v]) => v === answer.correct)![0];
  const prompt = data!.client_prompt as { options: { id: string; text: string }[] };
  return prompt.options.find((o) => o.id === opaque)!.text;
}
