import { fail, withUser } from "@/lib/api/handler";
import { PositionSchema } from "@/lib/contracts/position";
import { MAPS } from "@/game/data/maps";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser({ input: PositionSchema }, async ({ userId, input }) => {
  if (!MAPS[input.mapKey].built) return fail("VALIDATION", "Unknown map", 400);
  // Profile position is a privileged column: write it through the service-role RPC.
  const { error } = await createAdminClient().rpc("svc_save_position", {
    p_user: userId,
    p_position: { ...input, updatedAt: Date.now() },
  });
  if (error) return fail("INTERNAL", "Could not save position", 500);
  return new Response(null, { status: 204 });
});
