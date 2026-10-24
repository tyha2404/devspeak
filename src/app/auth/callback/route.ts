import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PKCE code exchange for magic links, OAuth and identity linking. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/play";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/play";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
