import { ok, withUser } from "@/lib/api/handler";
import { loadPath } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId }) =>
  ok(
    { stages: await loadPath(createAdminClient(), userId) },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  ),
);
