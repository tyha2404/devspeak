import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({ key: z.string().max(64), period: z.string().max(16) });

export const POST = withUser({ input: Input }, async ({ userId, input }) => {
  const { data, error } = await createAdminClient().rpc("svc_claim_quest", {
    p_user: userId,
    p_key: input.key,
    p_period: input.period,
  });
  if (error) {
    if (error.hint === "ALREADY_CLAIMED") return fail("ALREADY_DONE", "Already claimed", 409);
    if (error.hint === "NOT_COMPLETED") return fail("LOCKED", "Quest not completed yet", 409);
    return fail("INTERNAL", "Could not claim", 500);
  }
  return ok(data);
});
