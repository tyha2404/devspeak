import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { startTestOut } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  {
    input: z.object({ unitId: z.number().int().positive() }),
    rateLimit: { bucket: "exam_start", limit: 20, windowSec: 3600 },
  },
  async ({ userId, input }) => {
    try {
      return ok(await startTestOut(createAdminClient(), userId, input.unitId));
    } catch (err) {
      return domainError(err);
    }
  },
);
