import { dayKey, withCron } from "@/lib/api/cron";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily 23:30 ICT: expired deliveries, old rate-limit windows, stale guests, outlier questions, 30-day chat retention.
export const GET = withCron("daily", dayKey, async () => {
  const { data, error } = await createAdminClient().rpc("svc_housekeeping");
  if (error) throw new Error(error.message);
  return data;
});
