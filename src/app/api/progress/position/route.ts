import { fail, withUser } from "@/lib/api/handler";
import { PositionSchema } from "@/lib/contracts/position";
import { MAPS } from "@/game/data/maps";
import { createAdminClient } from "@/lib/supabase/admin";

const RANKS = ["intern", "junior", "mid", "senior", "techlead"];

export const POST = withUser(
  { input: PositionSchema, rateLimit: { bucket: "position", limit: 30, windowSec: 60 } },
  async ({ userId, input, supabase }) => {
    const map = MAPS[input.mapKey];
    if (!map.built) return fail("VALIDATION", "Unknown map", 400);
    if (map.requires) {
      // Never persist a position inside a floor the learner hasn't unlocked.
      const { data: p } = await supabase.from("profiles").select("rank").eq("id", userId).single();
      if (RANKS.indexOf(p?.rank ?? "intern") < RANKS.indexOf(map.requires.split(":")[1]!)) {
        return fail("LOCKED", "Map not unlocked", 403);
      }
    }
    // Profile position is a privileged column: write it through the service-role RPC.
    const { error } = await createAdminClient().rpc("svc_save_position", {
      p_user: userId,
      p_position: { ...input, updatedAt: Date.now() },
    });
    if (error) return fail("INTERNAL", "Could not save position", 500);
    return new Response(null, { status: 204 });
  },
);
