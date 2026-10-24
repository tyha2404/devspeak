import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNext } from "@/lib/auth/redirect";

/** PKCE code exchange for magic links, OAuth and identity linking. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = safeAuthNext(next);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
