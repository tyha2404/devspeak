import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { startPractice } from "@/features/curriculum/practice";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ lessonId: z.number().int().positive() }),
    rateLimit: { bucket: "lesson_practice", limit: 60, windowSec: 3600 },
  },
  async ({ userId, input }) => {
    try {
      return ok(await startPractice(createAdminClient(), userId, input.lessonId));
    } catch (err) {
      return domainError(err);
    }
  },
);
