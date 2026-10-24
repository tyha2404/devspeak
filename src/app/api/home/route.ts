import { ok, withUser } from "@/lib/api/handler";
import { home } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId, isGuest, email }) =>
  ok(await home(createAdminClient(), userId, isGuest, email), {
    headers: { "Cache-Control": "private, no-store" },
  }),
);
