import { ok, withUser } from "@/lib/api/handler";
import { promotionStatus } from "@/features/promotion/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId }) =>
  ok(await promotionStatus(createAdminClient(), userId)),
);
