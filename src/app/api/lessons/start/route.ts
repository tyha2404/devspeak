import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { startLesson } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ lessonId: z.number().int().positive() }),
    rateLimit: { bucket: "lesson_start", limit: 60, windowSec: 3600 },
  },
  async ({ userId, input }) => {
    try {
      return ok(await startLesson(createAdminClient(), userId, input.lessonId));
    } catch (err) {
      return domainError(err);
    }
  },
);
