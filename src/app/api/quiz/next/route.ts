import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { nextDelivery } from "@/features/quiz/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser(
  { rateLimit: { bucket: "quiz_next", limit: 60, windowSec: 60 } },
  async ({ userId }, req) => {
    const sessionId = z.uuid().safeParse(new URL(req.url).searchParams.get("sessionId"));
    if (!sessionId.success) return fail("VALIDATION", "sessionId is required", 400);
    try {
      return ok(await nextDelivery(createAdminClient(), userId, sessionId.data), {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (err) {
      return domainError(err);
    }
  },
);
