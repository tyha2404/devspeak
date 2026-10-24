import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { createSession, pickPracticeQuestions } from "@/features/quiz/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  npcId: z.string().max(32).optional(),
  size: z.number().int().min(3).max(15).default(5),
});

/** Practice sessions. Dialogue and boss sessions are created by their own flows. */
export const POST = withUser({ input: Input }, async ({ userId, input }) => {
  try {
    const db = createAdminClient();
    const ids = await pickPracticeQuestions(db, userId, input.npcId, input.size);
    const session = await createSession(db, userId, {
      kind: "practice",
      npcId: input.npcId,
      questionIds: ids,
    });
    return ok({ sessionId: session.id, total: session.planned_count });
  } catch (err) {
    return domainError(err);
  }
});
