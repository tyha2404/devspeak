import { ok, withUser } from "@/lib/api/handler";
import { chatAvailability, SCENARIOS } from "@/features/npc-chat/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async () => {
  const a = await chatAvailability(createAdminClient());
  return ok({
    available: a.ok,
    reason: a.ok ? null : a.reason,
    npcs: SCENARIOS.map((s) => s.npcId),
  });
});
