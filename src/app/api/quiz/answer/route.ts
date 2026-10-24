import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { submitAnswer } from "@/features/quiz/service";
import { QuizResponse } from "@/features/quiz/types";
import { recordEvent } from "@/features/quests/progression";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({ deliveryId: z.uuid(), response: QuizResponse });

export const POST = withUser(
  {
    input: Input,
    rateLimit: [
      { bucket: "answer", limit: 30, windowSec: 60 },
      { bucket: "answer_day", limit: 1500, windowSec: 86400 },
    ],
  },
  async ({ userId, input }) => {
    try {
      const db = createAdminClient();
      const result = await submitAnswer(db, userId, input.deliveryId, input.response);
      if (!result.final) return ok(result);
      const { data: d } = await db
        .from("question_deliveries")
        .select("questions(type, npc_id)")
        .eq("id", input.deliveryId)
        .single();
      const q = d?.questions as unknown as { type: string; npc_id: string | null } | undefined;
      const progress = await recordEvent(db, userId, [
        { type: "answer", correct: result.correct, questionType: q?.type, npcId: q?.npc_id },
        { type: "xp", amount: result.xp },
      ]);
      return ok({ ...result, progress });
    } catch (err) {
      return domainError(err);
    }
  },
);
