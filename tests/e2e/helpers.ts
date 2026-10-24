import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
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

export type Dq = {
  mapKey: string;
  teleport: (x: number, y: number, facing?: string) => void;
  player: () => { x: number; y: number };
  npcs: () => string[];
};

export async function enterGame(page: Page, mapKey = "office-floor") {
  await page.goto("/play?e2e=1");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(
    (k) => (window as unknown as { __dq?: Dq }).__dq?.mapKey === k,
    mapKey,
  );
}

export const teleport = (page: Page, x: number, y: number, facing: string) =>
  page.evaluate(([x, y, f]) => (window as unknown as { __dq: Dq }).__dq.teleport(x, y, f), [
    x,
    y,
    facing,
  ] as const);

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
