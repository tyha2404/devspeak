import { z } from "zod";
import { withUser } from "@/lib/api/handler";
import { promotionCall } from "@/lib/api/promotionRoute";
import { finishBoss } from "@/features/promotion/service";
import { recordEvent } from "@/features/quests/progression";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ sessionId: z.uuid() }) },
  async ({ userId, input }) =>
    promotionCall(async () => {
      const db = createAdminClient();
      const r = await finishBoss(db, userId, input.sessionId);
      return {
        ...r,
        progress: await recordEvent(db, userId, [{ type: "xp", amount: r.passed ? 150 : 0 }]),
      };
    }),
);
