import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { startPlacement } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser({}, async ({ userId }) => {
  try {
    return ok(await startPlacement(createAdminClient(), userId));
  } catch (err) {
    return domainError(err);
  }
});
