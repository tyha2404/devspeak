import { getLlm } from "@/features/ai/client";
import { submitGeneration } from "@/features/ai/pipeline";
import { dayKey, withCron } from "@/lib/api/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Daily 00:00 ICT: plan and submit one generation batch (Batch API, 50% price, results < 24h).
export const GET = withCron("content-plan", dayKey, async () => {
  const maxPacks = Number(process.env.AI_DAILY_PACKS ?? 150);
  return submitGeneration(createAdminClient(), getLlm(), { maxPacks });
});
