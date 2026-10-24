import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GlossEntry } from "@/lib/contracts/learn";

/** Published senses by slug, in the shape learners see on flashcards and word lists. */
export async function glossary(
  db: SupabaseClient,
  slugs: string[],
): Promise<Record<string, GlossEntry>> {
  if (!slugs.length) return {};
  const { data, error } = await db
    .from("senses")
    .select(
      "slug, definition_en, meaning_vi, vi_usage_note, lexemes(display, pos, ipa), examples(text_en, text_vi)",
    )
    .in("slug", slugs)
    .eq("review_status", "published");
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((s) => {
      const lex = s.lexemes as unknown as { display: string; pos: string; ipa: string | null };
      const ex = (s.examples as unknown as { text_en: string; text_vi: string | null }[])[0];
      return [
        s.slug,
        {
          slug: s.slug,
          lemma: lex.display,
          pos: lex.pos,
          ipa: lex.ipa,
          vi: s.meaning_vi,
          def: s.definition_en,
          note: s.vi_usage_note,
          example: ex ? { en: ex.text_en, vi: ex.text_vi } : null,
        } satisfies GlossEntry,
      ];
    }),
  );
}
