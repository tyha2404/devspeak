import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, game assets and cron routes (cron authenticates with CRON_SECRET).
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/cron/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|json|ogg|m4a|mp3)$).*)",
  ],
};
