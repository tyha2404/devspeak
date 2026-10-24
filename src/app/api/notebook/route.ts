import { z } from "zod";
import { fail, ok, withUser } from "@/lib/api/handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = withUser({}, async ({ userId, supabase }) => {
  const { data, error } = await supabase
    .from("user_cards")
    .select(
      "state, due, reps, added_at, senses(slug, meaning_vi, definition_en, lexemes(display, ipa, pos))",
    )
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  if (error) return fail("INTERNAL", "Could not load notebook", 500);
  return ok(
    (data ?? []).map((c) => {
      const s = c.senses as unknown as {
        slug: string;
        meaning_vi: string;
        definition_en: string;
        lexemes: { display: string; ipa: string | null; pos: string };
      };
      return {
        slug: s.slug,
        lemma: s.lexemes.display,
        ipa: s.lexemes.ipa,
        pos: s.lexemes.pos,
        vi: s.meaning_vi,
        def: s.definition_en,
        state: c.state,
        due: c.due,
        reps: c.reps,
      };
    }),
  );
});

export const POST = withUser(
  { input: z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) }) },
  async ({ userId, supabase, input }) => {
    const { data: sense } = await supabase
      .from("senses")
      .select("id")
      .eq("slug", input.slug)
      .maybeSingle();
    if (!sense) return fail("NOT_FOUND", "Unknown word", 404);
    const { data, error } = await createAdminClient().rpc("svc_add_card", {
      p_user: userId,
      p_sense: sense.id,
      p_via: "notebook",
    });
    if (error) return fail("INTERNAL", "Could not save", 500);
    return ok({ added: !!data });
  },
);
