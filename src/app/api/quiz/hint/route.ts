import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { useHint } from "@/features/quiz/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ deliveryId: z.uuid() }) },
  async ({ userId, input }) => {
    try {
      return ok(await useHint(createAdminClient(), userId, input.deliveryId));
    } catch (err) {
      return domainError(err);
    }
  },
);
