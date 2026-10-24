import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "NOT_FOUND"
  | "ALREADY_ANSWERED"
  | "ALREADY_DONE"
  | "DELIVERY_EXPIRED"
  | "TOO_MANY_OPEN"
  | "EMPTY"
  | "LOCKED"
  | "BAD_CHOICE"
  | "QUIZ_NOT_FINISHED"
  | "DIALOGUE_NOT_FINISHED"
  | "TASK_NOT_GRADED"
  | "QUOTA_EXCEEDED"
  | "AI_UNAVAILABLE";

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ ok: true, data }, init);
export const fail = (code: ApiErrorCode, message: string, status: number) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

interface Ctx {
  userId: string;
  isGuest: boolean;
  email: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/** Route wrapper: authenticates the caller (guests included) and validates the JSON body. */
export interface RateLimit {
  bucket: string;
  limit: number;
  windowSec: number;
}

export function withUser<S extends z.ZodType | undefined = undefined>(
  opts: { input?: S; rateLimit?: RateLimit | RateLimit[]; registered?: boolean },
  handler: (
    ctx: Ctx & { input: S extends z.ZodType ? z.infer<S> : undefined },
    req: Request,
  ) => Promise<Response>,
) {
  return async (req: Request) => {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      const claims = data?.claims;
      if (!claims?.sub) return fail("UNAUTHENTICATED", "Sign in to continue", 401);
      if (opts.registered && claims.is_anonymous)
        return fail("FORBIDDEN", "Link an email or Google account first", 403);

      for (const rl of [opts.rateLimit ?? []].flat()) {
        const { data: allowed } = await createAdminClient().rpc("svc_rate_limit", {
          p_subject: claims.sub,
          p_bucket: rl.bucket,
          p_limit: rl.limit,
          p_window_s: rl.windowSec,
        });
        if (allowed === false) return fail("RATE_LIMITED", "Slow down a little", 429);
      }

      let input: unknown = undefined;
      if (opts.input) {
        const parsed = opts.input.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return fail("VALIDATION", parsed.error.message, 400);
        input = parsed.data;
      }
      return await handler(
        {
          userId: claims.sub,
          isGuest: claims.is_anonymous === true,
          email: typeof claims.email === "string" && claims.email ? claims.email : null,
          supabase,
          input: input as S extends z.ZodType ? z.infer<S> : undefined,
        },
        req,
      );
    } catch (err) {
      console.error(JSON.stringify({ route: new URL(req.url).pathname, error: String(err) }));
      return fail("INTERNAL", "Something went wrong", 500);
    }
  };
}
