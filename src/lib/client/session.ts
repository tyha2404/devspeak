import { publicEnv } from "@/env";
import { createClient } from "@/lib/supabase/browser";

/**
 * Ensures there is a Supabase session, creating an anonymous guest if needed ("Chơi ngay").
 * Guest progress can be merged into a registered account after signing in.
 */
export async function ensureSession(captchaToken?: string) {
  if (pending) return pending;
  pending = getOrCreateSession(captchaToken).finally(() => {
    pending = null;
  });
  return pending;
}

let pending: ReturnType<typeof getOrCreateSession> | null = null;

async function getOrCreateSession(captchaToken?: string) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await supabase.auth.signInAnonymously(
    publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY && captchaToken
      ? { options: { captchaToken } }
      : undefined,
  );
  if (error) throw error;
  return signedIn.session;
}
