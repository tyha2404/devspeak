import { fail, ok, withUser } from "@/lib/api/handler";
import { BootstrapSchema, type Bootstrap } from "@/lib/contracts/bootstrap";
import { z } from "zod";
import { PositionSchema } from "@/lib/contracts/position";

const RANK_ORDER = ["intern", "junior", "mid", "senior", "techlead"] as const;

export const GET = withUser({}, async ({ userId, isGuest, supabase }) => {
  const { data: p, error } = await supabase
    .from("profiles")
    .select("display_name, level, xp_total, coins, rank, streak_current, position")
    .eq("id", userId)
    .single();
  if (error || !p) return fail("INTERNAL", "Profile not found", 500);

  // The column default has no updatedAt: treat it as "never saved".
  const saved = PositionSchema.extend({ updatedAt: z.number() }).safeParse(p.position);

  const rankIndex = RANK_ORDER.indexOf(p.rank);
  const body: Bootstrap = {
    profile: {
      displayName: p.display_name,
      level: p.level,
      xpTotal: p.xp_total,
      coins: p.coins,
      rank: p.rank,
      streak: p.streak_current,
      isGuest,
    },
    position: saved.success ? saved.data : null,
    unlocks: RANK_ORDER.slice(1, rankIndex + 1).map((r) => `rank:${r}`),
  };
  return ok(BootstrapSchema.parse(body), { headers: { "Cache-Control": "private, no-store" } });
});
