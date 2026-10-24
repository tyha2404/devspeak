import { z } from "zod";
import { withUser } from "@/lib/api/handler";
import { promotionCall } from "@/lib/api/promotionRoute";
import { finishPlacement } from "@/features/promotion/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ sessionId: z.uuid() }) },
  async ({ userId, input }) =>
    promotionCall(() => finishPlacement(createAdminClient(), userId, input.sessionId)),
);
