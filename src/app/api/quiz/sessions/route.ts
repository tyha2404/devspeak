import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { loadPath } from "@/features/curriculum/service";
import { createSession, pickPracticeQuestions } from "@/features/quiz/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  unitId: z.number().int().positive().optional(),
  size: z.number().int().min(3).max(15).default(8),
});

/** Free practice over units the learner has opened. Lessons and exams create their own sessions. */
export const POST = withUser(
  { input: Input, rateLimit: { bucket: "practice", limit: 30, windowSec: 3600 } },
  async ({ userId, input }) => {
    try {
      const db = createAdminClient();
      const path = await loadPath(db, userId);
      const open = path.stages
        .flatMap((s) => s.units)
        .filter((u) => u.state === "completed" || u.state === "in_progress")
        .map((u) => u.id);
      const unitIds = input.unitId ? open.filter((id) => id === input.unitId) : open;
      if (!unitIds.length) return fail("LOCKED", "Học ít nhất một bài trước khi luyện tập", 403);
      const ids = await pickPracticeQuestions(db, userId, unitIds, input.size);
      const session = await createSession(db, userId, {
        kind: "practice",
        ref: input.unitId ? `unit:${input.unitId}` : undefined,
        questionIds: ids,
      });
      return ok({ sessionId: session.id, total: session.planned_count });
    } catch (err) {
      return domainError(err);
    }
  },
);
