import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { learnDaily } from "@/features/daily/service";
import { recordEvent } from "@/features/quests/progression";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  known: z.boolean().default(false),
});

export const POST = withUser({ input: Input }, async ({ userId, input }) => {
  const db = createAdminClient();
  const r = await learnDaily(db, userId, input.slug, input.known);
  if (!r) return fail("NOT_FOUND", "Not one of today's words", 404);
  const progress = r.firstTime
    ? await recordEvent(db, userId, [
        { type: "word_learned" },
        { type: "xp", amount: r.award.duplicate ? 0 : 5 },
      ])
    : { quests: [], achievements: [] };
  return ok({ ...r, progress });
});
