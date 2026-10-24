import { withUser } from "@/lib/api/handler";
import { promotionCall } from "@/lib/api/promotionRoute";
import { startPlacement } from "@/features/promotion/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser({}, async ({ userId }) =>
  promotionCall(() => startPlacement(createAdminClient(), userId)),
);
