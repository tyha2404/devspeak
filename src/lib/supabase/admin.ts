import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/env";

/**
 * Service-role client: bypasses RLS. Only for privileged writes through `private.*`
 * functions (XP, answers, SRS). Never use it for user-scoped reads.
 */
export function createAdminClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
