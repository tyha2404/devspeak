import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // CI exports the variables directly.
}

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: { persistSession: false },
  },
);

export async function newUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: `it-${crypto.randomUUID()}@test.dev`,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

/** Wait past the 800 ms anti-bot latency floor. */
export const humanPause = () => new Promise((r) => setTimeout(r, 850));
