import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { BootstrapSchema, type Bootstrap } from "@/lib/contracts/bootstrap";
import { PositionSchema } from "@/lib/contracts/position";
import { COSMETIC } from "@/game/config/cosmetics";
import { createAdminClient } from "@/lib/supabase/admin";

const RANK_ORDER = ["intern", "junior", "mid", "senior", "techlead"] as const;

export const GET = withUser({}, async ({ userId, isGuest, supabase }) => {
  const { data: p, error } = await supabase
    .from("profiles")
    .select(
      "display_name, level, xp_total, coins, rank, streak_current, streak_freezes, position, placement_level, avatar_key",
    )
    .eq("id", userId)
    .single();
  if (error || !p) return fail("INTERNAL", "Profile not found", 500);

  const db = createAdminClient();
  const [{ data: dialogues }, { data: runs }, { data: cosmetics }, { count: due }] =
    await Promise.all([
      db
        .from("dialogues")
        .select("id, npc_id")
        .eq("status", "published")
        .lte("unlock_level", p.level),
      db
        .from("dialogue_runs")
        .select("dialogue_id")
        .eq("user_id", userId)
        .not("completed_at", "is", null),
      supabase.from("user_cosmetics").select("item_id").eq("user_id", userId).eq("equipped", true),
      supabase
        .from("user_cards")
        .select("sense_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .lte("due", new Date().toISOString()),
    ]);
  const done = new Set((runs ?? []).map((r) => r.dialogue_id));
  const npcsWithNew = [
    ...new Set((dialogues ?? []).filter((d) => !done.has(d.id)).map((d) => d.npc_id as string)),
  ];

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
      ptoDays: p.streak_freezes,
      isGuest,
      placementDone: !!p.placement_level,
      avatar: p.avatar_key === "dev_01" ? "player" : p.avatar_key,
    },
    position: saved.success ? saved.data : null,
    unlocks: RANK_ORDER.slice(1, rankIndex + 1).map((r) => `rank:${r}`),
    npcsWithNew,
    deskItems: (cosmetics ?? [])
      .map((c) => COSMETIC[c.item_id])
      .filter((c) => c?.kind === "desk")
      .map((c) => c!.sprite!),
    srsDue: due ?? 0,
  };
  return ok(BootstrapSchema.parse(body), { headers: { "Cache-Control": "private, no-store" } });
});
