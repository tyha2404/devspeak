import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ApiErrorCode = "UNAUTHENTICATED" | "VALIDATION" | "RATE_LIMITED" | "INTERNAL";

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ ok: true, data }, init);
export const fail = (code: ApiErrorCode, message: string, status: number) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

interface Ctx {
  userId: string;
  isGuest: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/** Route wrapper: authenticates the caller (guests included) and validates the JSON body. */
export function withUser<S extends z.ZodType | undefined = undefined>(
  opts: { input?: S },
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
