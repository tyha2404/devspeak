import { fail, ok, withUser } from "@/lib/api/handler";
import { domainError } from "@/lib/api/errors";
import { glossary } from "@/features/dialogue/service";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/tracks/words?unitId=7 — every word of a vocabulary topic, in lesson order. */
export const GET = withUser({}, async (_ctx, req) => {
  const unitId = Number(new URL(req.url).searchParams.get("unitId"));
  if (!Number.isInteger(unitId) || unitId <= 0)
    return fail("VALIDATION", "unitId is required", 400);
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("lessons")
      .select("body")
      .eq("unit_id", unitId)
      .eq("kind", "vocab")
      .order("sort");
    if (error) throw error;
    const slugs = (data ?? []).flatMap((l) => (l.body as { senses?: string[] }).senses ?? []);
    const g = await glossary(db, slugs);
    return ok({ words: slugs.map((s) => g[s]).filter((w) => !!w) });
  } catch (err) {
    return domainError(err);
  }
});
