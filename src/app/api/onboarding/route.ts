import { z } from "zod";
import { ok, withUser } from "@/lib/api/handler";
import { saveOnboarding } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  dailyGoal: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]),
  reason: z.enum(["job", "interview", "docs", "client", "general"]),
  displayName: z.string().trim().min(1).max(32).optional(),
});

export const POST = withUser({ input: Input }, async ({ userId, input }) => {
  await saveOnboarding(createAdminClient(), userId, input);
  return ok({ saved: true });
});
