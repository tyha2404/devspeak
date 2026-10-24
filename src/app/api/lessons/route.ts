import { fail, ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { lessonView } from "@/features/curriculum/service";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/lessons?id=12 — the lesson's public content (no answer keys, no model answers). */
export const GET = withUser({}, async ({ userId }, req) => {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return fail("VALIDATION", "id is required", 400);
  try {
    return ok(await lessonView(createAdminClient(), userId, id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    return domainError(err);
  }
});
