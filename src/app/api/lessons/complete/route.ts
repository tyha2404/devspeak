import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { completeLesson } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ runId: z.uuid() }) },
  async ({ userId, input }) => {
    try {
      return ok(await completeLesson(createAdminClient(), userId, input.runId));
    } catch (err) {
      return domainError(err);
    }
  },
);
