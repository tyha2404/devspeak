import { ok, withUser } from "@/lib/api/handler";
import { getDaily } from "@/features/daily/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId }) =>
  ok(await getDaily(createAdminClient(), userId), {
    headers: { "Cache-Control": "private, no-store" },
  }),
);
