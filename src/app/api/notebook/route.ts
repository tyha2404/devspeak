import { fail, ok, withUser } from "@/lib/api/handler";

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
