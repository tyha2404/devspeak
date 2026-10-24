import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  deliveryId: z.uuid(),
  reason: z.enum(["wrong_answer", "ambiguous", "typo", "offensive", "other"]),
  note: z.string().max(500).optional(),
});

export const POST = withUser(
  { input: Input, rateLimit: { bucket: "report", limit: 20, windowSec: 86400 } },
  async ({ userId, supabase, input }) => {
    // Resolve the question from the learner's own delivery; the question id itself is never exposed.
    const { data: d } = await createAdminClient()
      .from("question_deliveries")
      .select("question_id, user_id")
      .eq("id", input.deliveryId)
      .maybeSingle();
    if (!d || d.user_id !== userId) return fail("NOT_FOUND", "Question not found", 404);
    const { error } = await supabase.from("question_reports").upsert(
      {
        user_id: userId,
        question_id: d.question_id,
        reason: input.reason,
        note: input.note ?? null,
      },
      {
        onConflict: "user_id,question_id",
        ignoreDuplicates: true,
      },
    );
    if (error) return fail("INTERNAL", "Could not save report", 500);
    await createAdminClient().rpc("svc_bump_report", { p_question: d.question_id });
    return ok({ reported: true });
  },
);
