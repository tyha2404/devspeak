import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { advanceDialogue } from "@/features/dialogue/service";
import { recordEvent } from "@/features/quests/progression";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  runId: z.uuid(),
  choiceId: z.string().max(16).optional(),
  text: z.string().trim().max(600).optional(),
});

export const POST = withUser(
  { input: Input, rateLimit: { bucket: "dialogue", limit: 60, windowSec: 60 } },
  async ({ userId, input }) => {
    try {
      const db = createAdminClient();
      const step = await advanceDialogue(db, userId, input.runId, input.choiceId, input.text);
      if (!step.done) return ok(step);
      const { data: run } = await db
        .from("dialogue_runs")
        .select("dialogues(npc_id)")
        .eq("id", input.runId)
        .single();
      const npcId = (run?.dialogues as unknown as { npc_id: string }).npc_id;
      const progress = await recordEvent(db, userId, [
        { type: "dialogue_complete", npcId },
        { type: "xp", amount: step.rewards?.xp ?? 0 },
        { type: "word_learned", count: 0 },
      ]);
      return ok({ ...step, progress });
    } catch (err) {
      return domainError(err);
    }
  },
);
