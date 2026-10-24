import { withUser } from "@/lib/api/handler";
import { promotionCall } from "@/lib/api/promotionRoute";
import { startBoss } from "@/features/promotion/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { rateLimit: { bucket: "boss", limit: 10, windowSec: 3600 } },
  async ({ userId }) => promotionCall(() => startBoss(createAdminClient(), userId)),
);
