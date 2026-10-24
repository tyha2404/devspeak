import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { skipPlacement } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

/** "Start from the beginning" — records placement at the first unit so it isn't offered again. */
export const POST = withUser({}, async ({ userId }) => {
  try {
    return ok(await skipPlacement(createAdminClient(), userId));
  } catch (err) {
    return domainError(err);
  }
});
