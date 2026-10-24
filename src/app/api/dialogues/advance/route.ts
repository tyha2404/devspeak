import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { advanceDialogue } from "@/features/dialogue/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  runId: z.uuid(),
  choiceId: z.string().max(16).optional(),
  text: z.string().trim().max(600).optional(),
});

export const POST = withUser(
  { input: Input, rateLimit: { bucket: "dialogue", limit: 60, windowSec: 60 } },
  async ({ userId, input }) => {
    try {
      const db = createAdminClient();
      return ok(await advanceDialogue(db, userId, input.runId, input.choiceId, input.text));
    } catch (err) {
      return domainError(err);
    }
  },
);
