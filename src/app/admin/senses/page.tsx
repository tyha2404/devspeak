import { createAdminClient } from "@/lib/supabase/admin";
import { publishSense } from "../actions";

/** Dataset-imported senses wait here until a bilingual editor approves the Vietnamese meaning. */
export default async function Senses() {
  const { data } = await createAdminClient()
    .from("senses")
    .select("id, slug, definition_en, meaning_vi, meaning_vi_source, lexemes(display, cefr, pos)")
    .neq("review_status", "published")
    .order("id")
    .limit(30);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Duyệt nghĩa tiếng Việt</h1>
      {!data?.length && <p>Không có nghĩa nào chờ duyệt.</p>}
      {data?.map((s) => {
        const lex = s.lexemes as unknown as { display: string; cefr: string | null; pos: string };
        return (
          <form key={s.id} action={publishSense} className="space-y-1 rounded bg-white p-3 text-sm">
            <input type="hidden" name="id" value={s.id} />
            <p>
              <b>{lex.display}</b> ({lex.pos}, {lex.cefr ?? "?"}) — {s.definition_en}
            </p>
            <div className="flex gap-2">
              <input
                name="meaning_vi"
                defaultValue={s.meaning_vi}
                className="flex-1 rounded border px-2 py-1"
              />
              <button className="rounded bg-[#2e7d32] px-3 py-1 text-white">Duyệt</button>
            </div>
            <p className="text-xs text-[#5c5c7a]">nguồn: {s.meaning_vi_source ?? "?"}</p>
          </form>
        );
      })}
    </div>
  );
}
