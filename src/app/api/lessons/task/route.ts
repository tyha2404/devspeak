import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { gradeTask } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ runId: z.uuid(), text: z.string().trim().min(1).max(1000) }),
    rateLimit: [
      { bucket: "task", limit: 10, windowSec: 600 },
      { bucket: "task_day", limit: 40, windowSec: 86400 },
    ],
  },
  async ({ userId, input }) => {
    try {
      return ok(await gradeTask(createAdminClient(), userId, input.runId, input.text));
    } catch (err) {
      return domainError(err);
    }
  },
);
