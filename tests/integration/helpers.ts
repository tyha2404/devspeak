import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
import { nextDelivery, submitAnswer } from "@/features/quiz/service";

try {
  loadEnvFile(".env.local");
} catch {
  // CI exports the variables directly.
}

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: { persistSession: false },
  },
);

export async function newUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: `it-${crypto.randomUUID()}@test.dev`,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

/** Wait past the 800 ms anti-bot latency floor. */
export const humanPause = () => new Promise((r) => setTimeout(r, 850));

/** Answer every question of a session through the real grading path; `correct(i)` picks right/wrong. */
export async function answerSession(
  userId: string,
  sessionId: string,
  correct: (i: number) => boolean,
) {
  let i = 0;
  for (;;) {
    const d = await nextDelivery(admin, userId, sessionId);
    if ("done" in d) return d;
    const { data } = await admin
      .from("question_deliveries")
      .select("option_map, question_versions(answer, prompt)")
      .eq("id", d.deliveryId)
      .single();
    const map = data!.option_map as Record<string, string>;
    const v = data!.question_versions as unknown as {
      answer: Record<string, unknown>;
      prompt: { tokens?: { id: string; text: string }[] };
    };
    const opaque = (c: string) => Object.entries(map).find(([, x]) => x === c)![0];
    await humanPause();
    const ok = correct(i++);
    const a = v.answer as {
      kind: string;
      correct?: string;
      accepted?: string[];
      text?: string;
      wrong?: string;
    };
    const response =
      a.kind === "choice"
        ? { kind: "choice" as const, optionId: ok ? opaque(a.correct!) : "nope" }
        : a.kind === "text"
          ? { kind: "text" as const, text: ok ? a.accepted![0]! : "zzzz" }
          : a.kind === "fix"
            ? {
                kind: "fix" as const,
                tokenId: opaque(a.wrong!),
                optionId: ok ? opaque(a.correct!) : "nope",
              }
            : {
                kind: "order" as const,
                tokenIds: ok ? v.prompt.tokens!.map((_, k) => opaque(`t${k}`)) : ["x"],
              };
    let r = await submitAnswer(admin, userId, d.deliveryId, response);
    if (!r.final) r = await submitAnswer(admin, userId, d.deliveryId, response);
  }
}
