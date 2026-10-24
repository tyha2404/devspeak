import { ok, withUser } from "@/lib/api/handler";
import { reviewQueue } from "@/features/srs/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser(
  { rateLimit: { bucket: "srs_queue", limit: 30, windowSec: 60 } },
  async ({ userId }) =>
    ok(await reviewQueue(createAdminClient(), userId), {
      headers: { "Cache-Control": "private, no-store" },
    }),
);
