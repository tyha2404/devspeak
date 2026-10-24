import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { startCheckpoint } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ stageId: z.number().int().positive() }),
    rateLimit: { bucket: "exam_start", limit: 20, windowSec: 3600 },
  },
  async ({ userId, input }) => {
    try {
      return ok(await startCheckpoint(createAdminClient(), userId, input.stageId));
    } catch (err) {
      return domainError(err);
    }
  },
);
