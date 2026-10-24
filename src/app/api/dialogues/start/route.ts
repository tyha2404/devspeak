import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { NPCS } from "@/game/data/npcs";
import { startDialogue } from "@/features/dialogue/service";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = withUser(
  { input: z.object({ npcId: z.string().max(32) }) },
  async ({ userId, supabase, input }) => {
    const npc = NPCS[input.npcId];
    if (!npc) return fail("NOT_FOUND", "Unknown NPC", 404);
    const { data: p } = await supabase.from("profiles").select("level").eq("id", userId).single();
    const level = p?.level ?? 1;
    if (npc.unlockLevel > level) return fail("LOCKED", `${npc.name} is not available yet`, 403);
    try {
      return ok(await startDialogue(createAdminClient(), userId, npc.id, level));
    } catch (err) {
      return domainError(err);
    }
  },
);
