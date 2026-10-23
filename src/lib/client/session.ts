import { publicEnv } from "@/env";
import { createClient } from "@/lib/supabase/browser";

/**
 * Ensures there is a Supabase session, creating an anonymous guest if needed ("Chơi ngay").
 * Guests can link an email/Google account later without losing progress (same user id).
 */
export async function ensureSession(captchaToken?: string) {
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
