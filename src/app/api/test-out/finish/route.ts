import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { finishTestOut } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ sessionId: z.uuid() }) },
  async ({ userId, input }) => {
    try {
      return ok(await finishTestOut(createAdminClient(), userId, input.sessionId));
    } catch (err) {
      return domainError(err);
    }
  },
);
