import { getLlm } from "@/features/ai/client";
import { pollBatches } from "@/features/ai/pipeline";
import { slotKey, withCron } from "@/lib/api/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Every 15 min: ingest finished batches (resumable; ~300 results per run).
export const GET = withCron(
  "batch-poll",
  () => slotKey(15),
  async () => ({
    jobs: await pollBatches(createAdminClient(), getLlm()),
  }),
);
